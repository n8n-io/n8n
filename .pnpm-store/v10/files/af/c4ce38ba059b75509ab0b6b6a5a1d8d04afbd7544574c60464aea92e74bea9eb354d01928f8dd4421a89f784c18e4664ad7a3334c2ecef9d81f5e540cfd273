import { LogContext } from './context';
interface LogMessage {
    context: LogContext;
    message: string;
    sequence: number;
    time: number;
}
declare type LogMessageFormatter = (msg: LogMessage) => string;
declare type LogMessageTranslator = (msg: LogMessage) => LogMessage;
interface LogFormattersMap {
    json: LogMessageFormatter;
    simple: LogMessageFormatter;
    [key: string]: LogMessageFormatter;
}
declare let LogFormatters: LogFormattersMap;
declare const resetLogFormatters: () => void;
declare const registerLogFormatter: (name: string, format: LogMessageFormatter) => void;
export { LogMessage, LogMessageTranslator, LogMessageFormatter, LogFormatters, resetLogFormatters, registerLogFormatter, };
