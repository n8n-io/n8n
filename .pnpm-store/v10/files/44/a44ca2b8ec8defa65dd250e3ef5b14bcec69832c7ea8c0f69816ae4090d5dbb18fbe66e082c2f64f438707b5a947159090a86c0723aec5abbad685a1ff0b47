const deprecatedMessages: string[] = []

export function useDeprecated(msg: string) {
    if (!deprecatedMessages.includes(msg)) {
        deprecatedMessages.push(msg)
        console.warn(msg)
    }
}
