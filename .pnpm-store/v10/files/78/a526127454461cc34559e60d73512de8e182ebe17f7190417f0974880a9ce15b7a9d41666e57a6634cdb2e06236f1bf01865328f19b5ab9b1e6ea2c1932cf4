import {hrtime} from 'node:process';

// Start counting time before spawning the subprocess
export const getStartTime = () => hrtime.bigint();

// Compute duration after the subprocess ended.
// Printed by the `verbose` option.
export const getDurationMs = startTime => Number(hrtime.bigint() - startTime) / 1e6;
