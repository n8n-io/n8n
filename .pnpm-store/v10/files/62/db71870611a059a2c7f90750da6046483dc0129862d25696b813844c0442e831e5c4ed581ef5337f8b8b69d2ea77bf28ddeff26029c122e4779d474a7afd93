Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const common = require('./common.js');

/**
 * Instruments the `node-schedule` library to send a check-in event to Sentry for each job execution.
 *
 * ```ts
 * import * as Sentry from '@sentry/node';
 * import * as schedule from 'node-schedule';
 *
 * const scheduleWithCheckIn = Sentry.cron.instrumentNodeSchedule(schedule);
 *
 * const job = scheduleWithCheckIn.scheduleJob('my-cron-job', '* * * * *', () => {
 *  console.log('You will see this message every minute');
 * });
 * ```
 */
function instrumentNodeSchedule(lib) {
  return new Proxy(lib, {
    get(target, prop) {
      if (prop === 'scheduleJob') {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        return new Proxy(target.scheduleJob, {
          apply(target, thisArg, argArray) {
            const [nameOrExpression, expressionOrCallback, callback] = argArray;

            if (
              typeof nameOrExpression !== 'string' ||
              typeof expressionOrCallback !== 'string' ||
              typeof callback !== 'function'
            ) {
              throw new Error(
                "Automatic instrumentation of 'node-schedule' requires the first parameter of 'scheduleJob' to be a job name string and the second parameter to be a crontab string",
              );
            }

            const monitorSlug = nameOrExpression;
            const expression = expressionOrCallback;

            async function monitoredCallback() {
              return core.withMonitor(
                monitorSlug,
                async () => {
                  await callback?.();
                },
                {
                  schedule: { type: 'crontab', value: common.replaceCronNames(expression) },
                },
              );
            }

            return target.apply(thisArg, [monitorSlug, expression, monitoredCallback]);
          },
        });
      }

      return target[prop];
    },
  });
}

exports.instrumentNodeSchedule = instrumentNodeSchedule;
//# sourceMappingURL=node-schedule.js.map
