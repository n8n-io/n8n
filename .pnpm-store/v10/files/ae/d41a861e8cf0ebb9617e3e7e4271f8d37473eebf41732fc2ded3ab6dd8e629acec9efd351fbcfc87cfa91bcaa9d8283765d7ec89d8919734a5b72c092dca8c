declare enum LogContexts {
    application = "application",
    hostname = "hostname",
    logLevel = "logLevel",
    namespace = "namespace",
    package = "package"
}
interface LogContext {
    [key: string]: any;
    [LogContexts.application]?: string;
    [LogContexts.hostname]?: string;
    [LogContexts.logLevel]?: number;
    [LogContexts.namespace]?: string;
    [LogContexts.package]?: string;
}
export { LogContext, LogContexts };
