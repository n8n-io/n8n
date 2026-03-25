/**
 * The `clamp` function restricts a number within a specified range by returning the value itself if it
 * falls within the range, or the closest boundary value if it exceeds the range.
 * @param {number} value - The `value` parameter represents the number that you want to clamp within
 * the specified range defined by `min` and `max` values.
 * @param {number} min - If the `value` parameter is less than the `min` value, the
 * function will return the `min` value.
 * @param {number} max - If the `value` parameter is greater than the `max` value,
 * the function will return `max`.
 * @returns The `clamp` function returns the value of `value` constrained within the range defined by
 * `min` and `max`.
 */
export function clamp(value: number, min: number = Number.NEGATIVE_INFINITY, max: number = Number.POSITIVE_INFINITY): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * The function `roundToStepPrecision` rounds a number to a specified precision step.
 * @param {number} value - The `value` parameter is the number that you want to round to a specific
 * precision based on the `step` parameter.
 * @param {number} step - The `step` parameter in the `roundToStepPrecision` function represents the
 * interval at which you want to round the `value`. For example, if `step` is 0.5, the `value` will be
 * rounded to the nearest half.
 * @returns the `roundedValue` after rounding it to the precision specified by the `step`.
 */
export function roundToStepPrecision(value: number, step: number) {
  let roundedValue = value
  const stepString = step.toString()
  const pointIndex = stepString.indexOf('.')
  const precision = pointIndex >= 0 ? stepString.length - pointIndex : 0
  if (precision > 0) {
    const pow = 10 ** precision
    roundedValue = Math.round(roundedValue * pow) / pow
  }
  return roundedValue
}

/**
 * The function `snapValueToStep` snaps a given value to the nearest step within a specified range.
 * @param {number} value - The `value` parameter represents the number that you want to snap to the
 * nearest step value.
 * @param {number | undefined} min - The `min` parameter represents the minimum value that the `value`
 * should be snapped to. If `value` is less than `min`, it will be snapped to `min`. If `min` is not
 * provided (undefined), then the snapping will not consider a minimum value.
 * @param {number | undefined} max - The `max` parameter represents the maximum value that the `value`
 * should be snapped to. It ensures that the snapped value does not exceed this maximum value.
 * @param {number} step - The `step` parameter in the `snapValueToStep` function represents the
 * interval at which the `value` should be snapped to. It determines the granularity of the snapping
 * operation. For example, if `step` is 5, the `value` will be snapped to the nearest multiple of
 * @returns a number that has been snapped to the nearest step value within the specified range of minimum and maximum values.
 */
export function snapValueToStep(value: number, min: number | undefined, max: number | undefined, step: number): number {
  min = Number(min)
  max = Number(max)
  const remainder = ((value - (Number.isNaN(min) ? 0 : min)) % step)
  let snappedValue = roundToStepPrecision(Math.abs(remainder) * 2 >= step
    ? value + Math.sign(remainder) * (step - Math.abs(remainder))
    : value - remainder, step)

  if (!Number.isNaN(min)) {
    if (snappedValue < min)
      snappedValue = min
    else if (!Number.isNaN(max) && snappedValue > max)
      snappedValue = min + Math.floor(roundToStepPrecision((max - min) / step, step)) * step
  }
  else if (!Number.isNaN(max) && snappedValue > max) {
    snappedValue = Math.floor(roundToStepPrecision(max / step, step)) * step
  }

  // correct floating point behavior by rounding to step precision
  snappedValue = roundToStepPrecision(snappedValue, step)

  return snappedValue
}
