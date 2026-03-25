const NPM = 'npm';
export const NPM_CLIENTS = new Set([
    NPM,
    'yarn',
    'pnpm',
    'bun',
    'deno',
]);
let npmClient;
export const getNpmClient = () => {
    if (npmClient) {
        return npmClient;
    }
    const client = process.env.npm_config_user_agent?.split('/')[0];
    npmClient = client && NPM_CLIENTS.has(client) ? client : NPM;
    return npmClient;
};
export const getNpmInstallCommand = (packageName) => `${getNpmClient()} ${npmClient === NPM ? 'i' : 'add'} ${npmClient === 'deno' ? `${NPM}:` : ''}${packageName}`;
//# sourceMappingURL=npm-client.js.map