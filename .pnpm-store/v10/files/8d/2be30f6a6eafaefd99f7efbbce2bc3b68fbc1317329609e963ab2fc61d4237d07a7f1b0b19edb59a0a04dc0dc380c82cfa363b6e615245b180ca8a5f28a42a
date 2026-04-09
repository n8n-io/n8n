async function handleData($, data) {
    if ($.index == -1) {
        $.currentInput = $.input;
    }
    function clear() {
        $.terminal.write('\x1b[2K\r' + $.prompt);
    }
    const x = $.terminal.buffer.active.cursorX - $.promptLength;
    switch (data) {
        case 'ArrowUp':
        case '\x1b[A':
            clear();
            if ($.index < $.inputs.length - 1) {
                $.input = $.inputs[++$.index];
            }
            $.terminal.write($.input);
            break;
        case 'ArrowDown':
        case '\x1b[B':
            clear();
            if ($.index >= 0) {
                $.input = $.index-- == 0 ? $.currentInput : $.inputs[$.index];
            }
            $.terminal.write($.input);
            break;
        case '\x1b[D':
            if (x > 0) {
                $.terminal.write(data);
            }
            break;
        case '\x1b[C':
            if (x < $.input.length) {
                $.terminal.write(data);
            }
            break;
        case '\x1b[F':
            $.terminal.write(`\x1b[${$.promptLength + $.input.length + 1}G`);
            break;
        case '\x1b[H':
            $.terminal.write(`\x1b[${$.promptLength + 1}G`);
            break;
        case '\x7f':
            if (x <= 0) {
                return;
            }
            $.terminal.write('\b\x1b[P');
            $.input = $.input.slice(0, x - 1) + $.input.slice(x);
            break;
        case '\r':
            if ($.input != $.inputs[0]) {
                $.inputs.unshift($.input);
            }
            $.terminal.write('\r\n');
            await $.onLine($.input);
            $.index = -1;
            $.input = '';
            $.terminal.write($.prompt);
            break;
        default:
            $.terminal.write(data);
            $.input = $.input.slice(0, x) + data + $.input.slice(x);
    }
}
/**
 * Creates a new shell using the provided options
 */
export function createShell(options) {
    const context = {
        terminal: options.terminal,
        get prompt() {
            return options.prompt ?? '';
        },
        get promptLength() {
            return options.promptLength ?? this.prompt.length;
        },
        onLine: options.onLine ?? (() => { }),
        input: '',
        index: -1,
        currentInput: '',
        inputs: [],
    };
    options.terminal.onData(data => handleData(context, data));
    return context;
}
