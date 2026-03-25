import constants from 'node:constants';
export const allSignals = 
// this is the full list of signals that Node will let us do anything with
Object.keys(constants).filter(k => k.startsWith('SIG') &&
    // https://github.com/tapjs/signal-exit/issues/21
    k !== 'SIGPROF' &&
    // no sense trying to listen for SIGKILL, it's impossible
    k !== 'SIGKILL');
// These are some obscure signals that are reported by kill -l
// on macOS, Linux, or Windows, but which don't have any mapping
// in Node.js. No sense trying if they're just going to throw
// every time on every platform.
//
// 'SIGEMT',
// 'SIGLOST',
// 'SIGPOLL',
// 'SIGRTMAX',
// 'SIGRTMAX-1',
// 'SIGRTMAX-10',
// 'SIGRTMAX-11',
// 'SIGRTMAX-12',
// 'SIGRTMAX-13',
// 'SIGRTMAX-14',
// 'SIGRTMAX-15',
// 'SIGRTMAX-2',
// 'SIGRTMAX-3',
// 'SIGRTMAX-4',
// 'SIGRTMAX-5',
// 'SIGRTMAX-6',
// 'SIGRTMAX-7',
// 'SIGRTMAX-8',
// 'SIGRTMAX-9',
// 'SIGRTMIN',
// 'SIGRTMIN+1',
// 'SIGRTMIN+10',
// 'SIGRTMIN+11',
// 'SIGRTMIN+12',
// 'SIGRTMIN+13',
// 'SIGRTMIN+14',
// 'SIGRTMIN+15',
// 'SIGRTMIN+16',
// 'SIGRTMIN+2',
// 'SIGRTMIN+3',
// 'SIGRTMIN+4',
// 'SIGRTMIN+5',
// 'SIGRTMIN+6',
// 'SIGRTMIN+7',
// 'SIGRTMIN+8',
// 'SIGRTMIN+9',
// 'SIGSTKFLT',
// 'SIGUNUSED',
//# sourceMappingURL=all-signals.js.map