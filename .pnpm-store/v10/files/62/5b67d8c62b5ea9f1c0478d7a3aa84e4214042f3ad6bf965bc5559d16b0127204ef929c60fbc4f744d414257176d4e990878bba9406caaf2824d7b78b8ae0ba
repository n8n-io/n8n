import { join } from 'node:path'
import { tmpdir } from 'node:os'
import pinoPretty from 'pino-pretty'
import { LoggerOptions, StreamEntry, pino } from '../../pino'

const destination = join(
    tmpdir(),
    '_' + Math.random().toString(36).substr(2, 9)
)

// Single
const transport = pino.transport({
    target: 'pino-pretty',
    options: { some: 'options for', the: 'transport' }
})
const logger = pino(transport)
logger.setBindings({ some: 'bindings' })
logger.info('test2')
logger.flush()

const transport2 = pino.transport({
    target: 'pino-pretty',
})
const logger2 = pino(transport2)
logger2.info('test2')


// Multiple

const transports = pino.transport({targets: [
    {
        level: 'info',
        target: 'pino-pretty',
        options: { some: 'options for', the: 'transport' }
    },
    {
        level: 'trace',
        target: 'pino/file',
        options: { destination }
    }
]})
const loggerMulti = pino(transports)
loggerMulti.info('test2')

// custom levels

const customLevels = {
    customDebug   : 1,
    info    : 2,
    customNetwork : 3,
    customError   : 4,
};

type CustomLevels = keyof typeof customLevels;

const pinoOpts = {
    useOnlyCustomLevels: true,
    customLevels: customLevels,
    level: 'customDebug',
} satisfies LoggerOptions;

const multistreamOpts = {
    dedupe: true,
    levels: customLevels
};

const streams: StreamEntry<CustomLevels>[] = [
    { level : 'customDebug',   stream : pinoPretty() },
    { level : 'info',    stream : pinoPretty() },
    { level : 'customNetwork', stream : pinoPretty() },
    { level : 'customError',   stream : pinoPretty() },
];

const loggerCustomLevel = pino(pinoOpts, pino.multistream(streams, multistreamOpts));
loggerCustomLevel.customDebug('test3')
loggerCustomLevel.info('test4')
loggerCustomLevel.customError('test5')
loggerCustomLevel.customNetwork('test6')
