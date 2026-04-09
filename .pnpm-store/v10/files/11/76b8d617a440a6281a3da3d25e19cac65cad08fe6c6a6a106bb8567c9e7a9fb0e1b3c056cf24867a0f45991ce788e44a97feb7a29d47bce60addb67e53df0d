export const createAggregatedClient = (commands, Client, options) => {
    for (const [command, CommandCtor] of Object.entries(commands)) {
        const methodImpl = async function (args, optionsOrCb, cb) {
            const command = new CommandCtor(args);
            if (typeof optionsOrCb === "function") {
                this.send(command, optionsOrCb);
            }
            else if (typeof cb === "function") {
                if (typeof optionsOrCb !== "object")
                    throw new Error(`Expected http options but got ${typeof optionsOrCb}`);
                this.send(command, optionsOrCb || {}, cb);
            }
            else {
                return this.send(command, optionsOrCb);
            }
        };
        const methodName = (command[0].toLowerCase() + command.slice(1)).replace(/Command$/, "");
        Client.prototype[methodName] = methodImpl;
    }
    const { paginators = {}, waiters = {} } = options ?? {};
    for (const [paginatorName, paginatorFn] of Object.entries(paginators)) {
        if (Client.prototype[paginatorName] === void 0) {
            Client.prototype[paginatorName] = function (commandInput = {}, paginationConfiguration, ...rest) {
                return paginatorFn({
                    ...paginationConfiguration,
                    client: this,
                }, commandInput, ...rest);
            };
        }
    }
    for (const [waiterName, waiterFn] of Object.entries(waiters)) {
        if (Client.prototype[waiterName] === void 0) {
            Client.prototype[waiterName] = async function (commandInput = {}, waiterConfiguration, ...rest) {
                let config = waiterConfiguration;
                if (typeof waiterConfiguration === "number") {
                    config = {
                        maxWaitTime: waiterConfiguration,
                    };
                }
                return waiterFn({
                    ...config,
                    client: this,
                }, commandInput, ...rest);
            };
        }
    }
};
