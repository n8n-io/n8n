import { withMonitor, captureException } from '@sentry/core';
import { replaceCronNames } from './common.js';

const ERROR_TEXT = 'Automatic instrumentation of CronJob only supports crontab string';

/**
 * Instruments the `cron` library to send a check-in event to Sentry for each job execution.
 *
 * ```ts
 * import * as Sentry from '@sentry/node';
 * import { CronJob } from 'cron';
 *
 * const CronJobWithCheckIn = Sentry.cron.instrumentCron(CronJob, 'my-cron-job');
 *
 * // use the constructor
 * const job = new CronJobWithCheckIn('* * * * *', () => {
 *  console.log('You will see this message every minute');
 * });
 *
 * // or from
 * const job = CronJobWithCheckIn.from({ cronTime: '* * * * *', onTick: () => {
 *   console.log('You will see this message every minute');
 * });
 * ```
 */
function instrumentCron(lib, monitorSlug) {
  let jobScheduled = false;

  return new Proxy(lib, {
    construct(target, args) {
      const [cronTime, onTick, onComplete, start, timeZone, ...rest] = args;

      if (typeof cronTime !== 'string') {
        throw new Error(ERROR_TEXT);
      }

      if (jobScheduled) {
        throw new Error(`A job named '${monitorSlug}' has already been scheduled`);
      }

      jobScheduled = true;

      const cronString = replaceCronNames(cronTime);

      async function monitoredTick(context, onComplete) {
        return withMonitor(
          monitorSlug,
          async () => {
            try {
              await onTick(context, onComplete);
            } catch (e) {
              captureException(e, {
                mechanism: {
                  handled: false,
                  type: 'auto.function.cron.instrumentCron',
                },
              });
              throw e;
            }
          },
          {
            schedule: { type: 'crontab', value: cronString },
            timezone: timeZone || undefined,
          },
        );
      }

      return new target(cronTime, monitoredTick, onComplete, start, timeZone, ...rest);
    },
    get(target, prop) {
      if (prop === 'from') {
        return (param) => {
          const { cronTime, onTick, timeZone } = param;

          if (typeof cronTime !== 'string') {
            throw new Error(ERROR_TEXT);
          }

          if (jobScheduled) {
            throw new Error(`A job named '${monitorSlug}' has already been scheduled`);
          }

          jobScheduled = true;

          const cronString = replaceCronNames(cronTime);

          param.onTick = async (context, onComplete) => {
            return withMonitor(
              monitorSlug,
              async () => {
                try {
                  await onTick(context, onComplete);
                } catch (e) {
                  captureException(e, {
                    mechanism: {
                      handled: false,
                      type: 'auto.function.cron.instrumentCron',
                    },
                  });
                  throw e;
                }
              },
              {
                schedule: { type: 'crontab', value: cronString },
                timezone: timeZone || undefined,
              },
            );
          };

          return target.from(param);
        };
      } else {
        return target[prop];
      }
    },
  });
}

export { instrumentCron };
//# sourceMappingURL=cron.js.map
