export function assert(
  expectedCondition: any,
  message = 'Assertion failed!',
): asserts expectedCondition {
  if (!expectedCondition) {
    console.error(message)

    throw new Error(message)
  }
}
