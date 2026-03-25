import type { Parser, Handler } from "../Parser.js";

interface Event {
    $event: string;
    data: unknown[];
    startIndex: number;
    endIndex: number;
}

/**
 * Creates a handler that calls the supplied callback with simplified events on
 * completion.
 *
 * @internal
 * @param callback Function to call with all events.
 */
export function getEventCollector(
    callback: (error: Error | null, events?: Event[]) => void,
): Partial<Handler> {
    const events: Event[] = [];
    let parser: Parser;

    function handle(event: string, data: unknown[]): void {
        switch (event) {
            case "onerror": {
                callback(data[0] as Error);

                break;
            }
            case "onend": {
                callback(null, events);

                break;
            }
            case "onreset": {
                events.length = 0;

                break;
            }
            case "onparserinit": {
                parser = data[0] as Parser;

                // Don't collect event
                break;
            }
            default: {
                // eslint-disable-next-line unicorn/prefer-at
                const last = events[events.length - 1];

                // Combine text nodes
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (event === "ontext" && last && last.$event === "text") {
                    (last.data[0] as string) += data[0];
                    last.endIndex = parser.endIndex;

                    break;
                }

                // Remove `undefined`s from attribute responses, as they cannot be represented in JSON.
                if (event === "onattribute" && data[2] === undefined) {
                    data.pop();
                }

                if (!(parser.startIndex <= parser.endIndex)) {
                    throw new Error(
                        `Invalid start/end index ${parser.startIndex} > ${parser.endIndex}`,
                    );
                }

                events.push({
                    $event: event.slice(2),
                    startIndex: parser.startIndex,
                    endIndex: parser.endIndex,
                    data,
                });
            }
        }
    }

    return new Proxy(
        {},
        {
            get:
                (_, event: string) =>
                (...data: unknown[]) =>
                    handle(event, data),
        },
    );
}
