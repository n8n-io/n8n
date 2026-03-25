async function importChildProcess() {
    const { exec } = await import("child_process");
    return { exec };
}
const execGit = (command, exec) => {
    return new Promise((resolve) => {
        exec(`git ${command.join(" ")}`, (error, stdout) => {
            if (error) {
                resolve(null);
            }
            else {
                resolve(stdout.trim());
            }
        });
    });
};
export const getGitInfo = async (remote = "origin") => {
    let exec;
    try {
        const execImport = await importChildProcess();
        exec = execImport.exec;
    }
    catch (e) {
        // no-op
        return null;
    }
    const isInsideWorkTree = await execGit(["rev-parse", "--is-inside-work-tree"], exec);
    if (!isInsideWorkTree) {
        return null;
    }
    const [remoteUrl, commit, commitTime, branch, tags, dirty, authorName, authorEmail,] = await Promise.all([
        execGit(["remote", "get-url", remote], exec),
        execGit(["rev-parse", "HEAD"], exec),
        execGit(["log", "-1", "--format=%ct"], exec),
        execGit(["rev-parse", "--abbrev-ref", "HEAD"], exec),
        execGit(["describe", "--tags", "--exact-match", "--always", "--dirty"], exec),
        execGit(["status", "--porcelain"], exec).then((output) => output !== ""),
        execGit(["log", "-1", "--format=%an"], exec),
        execGit(["log", "-1", "--format=%ae"], exec),
    ]);
    return {
        remoteUrl,
        commit,
        commitTime,
        branch,
        tags,
        dirty,
        authorName,
        authorEmail,
    };
};
export const getDefaultRevisionId = async () => {
    let exec;
    try {
        const execImport = await importChildProcess();
        exec = execImport.exec;
    }
    catch (e) {
        // no-op
        return null;
    }
    const commit = await execGit(["rev-parse", "HEAD"], exec);
    if (!commit) {
        return null;
    }
    return commit;
};
