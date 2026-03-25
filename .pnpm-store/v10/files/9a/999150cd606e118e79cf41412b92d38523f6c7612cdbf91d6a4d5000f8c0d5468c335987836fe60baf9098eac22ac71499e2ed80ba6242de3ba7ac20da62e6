import { CreateLoggerOptions, Logger } from '../logger';
import { ExtendedArray, LogTargetMock, extendArray } from './target-mock';
declare const setupForTesting: (target?: LogTargetMock) => void;
interface LoggerMock extends Logger {
    readonly target: LogTargetMock;
}
declare const createLoggerMock: (options?: CreateLoggerOptions | undefined, target?: LogTargetMock) => LoggerMock;
export { LogTargetMock, ExtendedArray, extendArray, setupForTesting as setup, createLoggerMock, LoggerMock };
