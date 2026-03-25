"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePush = handlePush;
const fs = require("fs");
const path = require("path");
const openapi_core_1 = require("@redocly/openapi-core");
const utils_1 = require("@redocly/openapi-core/lib/utils");
const colorette_1 = require("colorette");
const miscellaneous_1 = require("../../utils/miscellaneous");
const push_status_1 = require("./push-status");
const api_1 = require("../api");
const utils_2 = require("./utils");
async function handlePush({ argv, config, version, }) {
    const startedAt = performance.now(); // for printing execution time
    const startTime = Date.now(); // for push-status command
    const { organization, project: projectId, 'mount-path': mountPath, verbose } = argv;
    const orgId = organization || config.organization;
    if (!argv.message || !argv.author || !argv.branch) {
        (0, miscellaneous_1.exitWithError)('Error: message, author and branch are required for push to the Reunite.');
    }
    if (!orgId) {
        return (0, miscellaneous_1.exitWithError)(`No organization provided, please use --organization option or specify the 'organization' field in the config file.`);
    }
    const domain = argv.domain || (0, api_1.getDomain)();
    if (!domain) {
        return (0, miscellaneous_1.exitWithError)(`No domain provided, please use --domain option or environment variable REDOCLY_AUTHORIZATION.`);
    }
    try {
        const { 'commit-sha': commitSha, 'commit-url': commitUrl, 'default-branch': defaultBranch, 'wait-for-deployment': waitForDeployment, 'max-execution-time': maxExecutionTime, } = argv;
        const author = parseCommitAuthor(argv.author);
        const apiKey = (0, api_1.getApiKeys)(domain);
        const filesToUpload = collectFilesToPush(argv.files || argv.apis);
        const commandName = 'push';
        if (!filesToUpload.length) {
            return (0, miscellaneous_1.printExecutionTime)(commandName, startedAt, `No files to upload`);
        }
        const client = new api_1.ReuniteApi({ domain, apiKey, version, command: commandName });
        const projectDefaultBranch = await client.remotes.getDefaultBranch(orgId, projectId);
        const remote = await client.remotes.upsert(orgId, projectId, {
            mountBranchName: projectDefaultBranch,
            mountPath,
        });
        process.stderr.write(`Uploading to ${remote.mountPath} ${filesToUpload.length} ${(0, utils_1.pluralize)('file', filesToUpload.length)}:\n`);
        const { id } = await client.remotes.push(orgId, projectId, {
            remoteId: remote.id,
            commit: {
                message: argv.message,
                branchName: argv.branch,
                sha: commitSha,
                url: commitUrl,
                createdAt: argv['created-at'],
                namespace: argv.namespace,
                repository: argv.repository,
                author,
            },
            isMainBranch: defaultBranch === argv.branch,
        }, filesToUpload.map((f) => ({ path: (0, openapi_core_1.slash)(f.name), stream: fs.createReadStream(f.path) })));
        filesToUpload.forEach((f) => {
            process.stderr.write((0, colorette_1.green)(`✓ ${f.name}\n`));
        });
        process.stdout.write('\n');
        process.stdout.write(`Push ID: ${id}\n`);
        if (waitForDeployment) {
            process.stdout.write('\n');
            await (0, push_status_1.handlePushStatus)({
                argv: {
                    organization: orgId,
                    project: projectId,
                    pushId: id,
                    wait: true,
                    domain,
                    'max-execution-time': maxExecutionTime,
                    'start-time': startTime,
                    'continue-on-deploy-failures': argv['continue-on-deploy-failures'],
                },
                config,
                version,
            });
        }
        verbose &&
            (0, miscellaneous_1.printExecutionTime)(commandName, startedAt, `${(0, utils_1.pluralize)('file', filesToUpload.length)} uploaded to organization ${orgId}, project ${projectId}. Push ID: ${id}.`);
        client.reportSunsetWarnings();
        return {
            pushId: id,
        };
    }
    catch (err) {
        (0, utils_2.handleReuniteError)('✗ File upload failed.', err);
    }
}
function parseCommitAuthor(author) {
    // Author Name <author@email.com>
    const reg = /^.+\s<[^<>]+>$/;
    if (!reg.test(author)) {
        throw new Error('Invalid author format. Use "Author Name <author@email.com>"');
    }
    const [name, email] = author.split('<');
    return {
        name: name.trim(),
        email: email.replace('>', '').trim(),
    };
}
function collectFilesToPush(files) {
    const collectedFiles = {};
    for (const file of files) {
        if (fs.statSync(file).isDirectory()) {
            const dir = file;
            const fileList = getFilesList(dir, []);
            fileList.forEach((f) => addFile(f, dir));
        }
        else {
            addFile(file, path.dirname(file));
        }
    }
    function addFile(filePath, fileDir) {
        const fileName = path.relative(fileDir, filePath);
        if (collectedFiles[fileName]) {
            process.stdout.write((0, colorette_1.yellow)(`File ${collectedFiles[fileName]} is overwritten by ${filePath}\n`));
        }
        collectedFiles[fileName] = filePath;
    }
    return Object.entries(collectedFiles).map(([name, filePath]) => getFileEntry(name, filePath));
}
function getFileEntry(name, filePath) {
    return {
        name,
        path: path.resolve(filePath),
    };
}
function getFilesList(dir, files) {
    const filesAndDirs = fs.readdirSync(dir);
    for (const name of filesAndDirs) {
        const currentPath = path.join(dir, name);
        if (fs.statSync(currentPath).isDirectory()) {
            files = getFilesList(currentPath, files);
        }
        else {
            files.push(currentPath);
        }
    }
    return files;
}
