interface IUpdate {
    pkg: {
        name: string;
        version: string;
    };
    updateCheckInterval?: number;
    shouldNotifyInNpmScript?: boolean;
    distTag?: string;
    alwaysRun?: boolean;
    debug?: boolean;
}
declare const simpleUpdateNotifier: (args: IUpdate) => Promise<void>;
export { simpleUpdateNotifier as default };
