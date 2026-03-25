export default function debounce<T extends Function>(
  callback: T,
  durationMs = 10,
) {
  let timeoutId: NodeJS.Timeout | null = null

  const callable = (...args: any) => {
    if (timeoutId !== null)
      clearTimeout(timeoutId)

    timeoutId = setTimeout(() => {
      callback(...args)
    }, durationMs)
  }

  return callable as unknown as T
}
