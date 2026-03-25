"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePushStatus = handlePushStatus;
const colors = require("colorette");
const miscellaneous_1 = require("../../utils/miscellaneous");
const spinner_1 = require("../../utils/spinner");
const utils_1 = require("../utils");
const api_1 = require("../api");
const js_utils_1 = require("../../utils/js-utils");
const utils_2 = require("./utils");
const RETRY_INTERVAL_MS = 5000; // 5 sec
async function handlePushStatus({ argv, config, version, }) {
    const startedAt = performance.now();
    const spinner = new spinner_1.Spinner();
    const { organization, project: projectId, pushId, wait } = argv;
    const orgId = organization || config.organization;
    if (!orgId) {
        (0, miscellaneous_1.exitWithError)(`No organization provided, please use --organization option or specify the 'organization' field in the config file.`);
        return;
    }
    const domain = argv.domain || (0, api_1.getDomain)();
    const maxExecutionTime = argv['max-execution-time'] || 1200; // 20 min
    const retryIntervalMs = argv['retry-interval']
        ? argv['retry-interval'] * 1000
        : RETRY_INTERVAL_MS;
    const startTime = argv['start-time'] || Date.now();
    const retryTimeoutMs = maxExecutionTime * 1000;
    const continueOnDeployFailures = argv['continue-on-deploy-failures'] || false;
    try {
        const apiKey = (0, api_1.getApiKeys)(domain);
        const client = new api_1.ReuniteApi({ domain, apiKey, version, command: 'push-status' });
        let pushResponse;
        pushResponse = await (0, utils_2.retryUntilConditionMet)({
            operation: () => client.remotes.getPush({
                organizationId: orgId,
                projectId,
                pushId,
            }),
            condition: wait
                ? // Keep retrying if status is "pending" or "running" (returning false, so the operation will be retried)
                    (result) => !['pending', 'running'].includes(result.status['preview'].deploy.status)
                : null,
            onConditionNotMet: (lastResult) => {
                displayDeploymentAndBuildStatus({
                    status: lastResult.status['preview'].deploy.status,
                    url: lastResult.status['preview'].deploy.url,
                    spinner,
                    buildType: 'preview',
                    continueOnDeployFailures,
                    wait,
                });
            },
            onRetry: (lastResult) => {
                if (argv.onRetry) {
                    argv.onRetry({
                        preview: lastResult.status.preview,
                        production: lastResult.isMainBranch ? lastResult.status.production : null,
                        commit: lastResult.commit,
                    });
                }
            },
            startTime,
            retryTimeoutMs,
            retryIntervalMs,
        });
        printPushStatus({
            buildType: 'preview',
            spinner,
            wait,
            push: pushResponse,
            continueOnDeployFailures,
        });
        printScorecard(pushResponse.status.preview.scorecard);
        const shouldWaitForProdDeployment = pushResponse.isMainBranch &&
            (wait ? pushResponse.status.preview.deploy.status === 'success' : true);
        if (shouldWaitForProdDeployment) {
            pushResponse = await (0, utils_2.retryUntilConditionMet)({
                operation: () => client.remotes.getPush({
                    organizationId: orgId,
                    projectId,
                    pushId,
                }),
                condition: wait
                    ? // Keep retrying if status is "pending" or "running" (returning false, so the operation will be retried)
                        (result) => !['pending', 'running'].includes(result.status['production'].deploy.status)
                    : null,
                onConditionNotMet: (lastResult) => {
                    displayDeploymentAndBuildStatus({
                        status: lastResult.status['production'].deploy.status,
                        url: lastResult.status['production'].deploy.url,
                        spinner,
                        buildType: 'production',
                        continueOnDeployFailures,
                        wait,
                    });
                },
                onRetry: (lastResult) => {
                    if (argv.onRetry) {
                        argv.onRetry({
                            preview: lastResult.status.preview,
                            production: lastResult.isMainBranch ? lastResult.status.production : null,
                            commit: lastResult.commit,
                        });
                    }
                },
                startTime,
                retryTimeoutMs,
                retryIntervalMs,
            });
        }
        if (pushResponse.isMainBranch) {
            printPushStatus({
                buildType: 'production',
                spinner,
                wait,
                push: pushResponse,
                continueOnDeployFailures,
            });
            printScorecard(pushResponse.status.production.scorecard);
        }
        printPushStatusInfo({ orgId, projectId, pushId, startedAt });
        client.reportSunsetWarnings();
        const summary = {
            preview: pushResponse.status.preview,
            production: pushResponse.isMainBranch ? pushResponse.status.production : null,
            commit: pushResponse.commit,
        };
        return summary;
    }
    catch (err) {
        spinner.stop(); // Spinner can block process exit, so we need to stop it explicitly.
        (0, utils_2.handleReuniteError)('✗ Failed to get push status.', err);
    }
    finally {
        spinner.stop(); // Spinner can block process exit, so we need to stop it explicitly.
    }
}
function printPushStatusInfo({ orgId, projectId, pushId, startedAt, }) {
    process.stderr.write(`\nProcessed push-status for ${colors.yellow(orgId)}, ${colors.yellow(projectId)} and pushID ${colors.yellow(pushId)}.\n`);
    (0, miscellaneous_1.printExecutionTime)('push-status', startedAt, 'Finished');
}
function printPushStatus({ buildType, spinner, push, continueOnDeployFailures, }) {
    if (!push) {
        return;
    }
    if (push.isOutdated || !push.hasChanges) {
        process.stderr.write(colors.yellow(`Files not added to your project. Reason: ${push.isOutdated ? 'outdated' : 'no changes'}.\n`));
    }
    else {
        displayDeploymentAndBuildStatus({
            status: push.status[buildType].deploy.status,
            url: push.status[buildType].deploy.url,
            buildType,
            spinner,
            continueOnDeployFailures,
        });
    }
}
function printScorecard(scorecard) {
    if (!scorecard || scorecard.length === 0) {
        return;
    }
    process.stdout.write(`\n${colors.magenta('Scorecard')}:`);
    for (const scorecardItem of scorecard) {
        process.stdout.write(`
    ${colors.magenta('Name')}: ${scorecardItem.name}
    ${colors.magenta('Status')}: ${scorecardItem.status}
    ${colors.magenta('URL')}: ${colors.cyan(scorecardItem.url)}
    ${colors.magenta('Description')}: ${scorecardItem.description}\n`);
    }
    process.stdout.write(`\n`);
}
function displayDeploymentAndBuildStatus({ status, url, spinner, buildType, continueOnDeployFailures, wait, }) {
    const message = getMessage({ status, url, buildType, wait });
    if (status === 'failed' && !continueOnDeployFailures) {
        spinner.stop();
        throw new utils_1.DeploymentError(message);
    }
    if (wait && (status === 'pending' || status === 'running')) {
        return spinner.start(message);
    }
    spinner.stop();
    return process.stdout.write(message);
}
function getMessage({ status, url, buildType, wait, }) {
    switch (status) {
        case 'skipped':
            return `${colors.yellow(`Skipped ${buildType}`)}\n`;
        case 'pending': {
            const message = `${colors.yellow(`Pending ${buildType}`)}`;
            return wait ? message : `Status: ${message}\n`;
        }
        case 'running': {
            const message = `${colors.yellow(`Running ${buildType}`)}`;
            return wait ? message : `Status: ${message}\n`;
        }
        case 'success':
            return `${colors.green(`🚀 ${(0, js_utils_1.capitalize)(buildType)} deploy success.`)}\n${colors.magenta(`${(0, js_utils_1.capitalize)(buildType)} URL`)}: ${colors.cyan(url || 'No URL yet.')}\n`;
        case 'failed':
            return `${colors.red(`❌ ${(0, js_utils_1.capitalize)(buildType)} deploy fail.`)}\n${colors.magenta(`${(0, js_utils_1.capitalize)(buildType)} URL`)}: ${colors.cyan(url || 'No URL yet.')}`;
        default: {
            const message = `${colors.yellow(`No status yet for ${buildType} deploy`)}`;
            return wait ? message : `Status: ${message}\n`;
        }
    }
}
