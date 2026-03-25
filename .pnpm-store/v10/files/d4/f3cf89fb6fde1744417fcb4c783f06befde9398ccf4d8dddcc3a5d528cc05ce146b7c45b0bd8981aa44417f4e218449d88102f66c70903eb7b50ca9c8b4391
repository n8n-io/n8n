"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = void 0;
function transformArguments(mode, options) {
    const args = [
        'CLIENT',
        'TRACKING',
        mode ? 'ON' : 'OFF'
    ];
    if (mode) {
        if (options?.REDIRECT) {
            args.push('REDIRECT', options.REDIRECT.toString());
        }
        if (isBroadcast(options)) {
            args.push('BCAST');
            if (options?.PREFIX) {
                if (Array.isArray(options.PREFIX)) {
                    for (const prefix of options.PREFIX) {
                        args.push('PREFIX', prefix);
                    }
                }
                else {
                    args.push('PREFIX', options.PREFIX);
                }
            }
        }
        else if (isOptIn(options)) {
            args.push('OPTIN');
        }
        else if (isOptOut(options)) {
            args.push('OPTOUT');
        }
        if (options?.NOLOOP) {
            args.push('NOLOOP');
        }
    }
    return args;
}
exports.transformArguments = transformArguments;
function isBroadcast(options) {
    return options?.BCAST === true;
}
function isOptIn(options) {
    return options?.OPTIN === true;
}
function isOptOut(options) {
    return options?.OPTOUT === true;
}
