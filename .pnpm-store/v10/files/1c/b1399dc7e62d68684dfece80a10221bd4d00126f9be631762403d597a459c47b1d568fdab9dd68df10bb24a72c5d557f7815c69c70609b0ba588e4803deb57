import process from 'node:process';

export const isStandardStream = stream => STANDARD_STREAMS.includes(stream);
export const STANDARD_STREAMS = [process.stdin, process.stdout, process.stderr];
export const STANDARD_STREAMS_ALIASES = ['stdin', 'stdout', 'stderr'];
export const getStreamName = fdNumber => STANDARD_STREAMS_ALIASES[fdNumber] ?? `stdio[${fdNumber}]`;
