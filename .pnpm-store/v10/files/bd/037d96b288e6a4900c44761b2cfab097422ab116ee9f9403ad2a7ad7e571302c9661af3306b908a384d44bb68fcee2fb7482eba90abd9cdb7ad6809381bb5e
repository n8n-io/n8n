// @flow

/**
 * Reduces hex values if possible e.g. #ff8866 to #f86
 * @private
 */
const reduceHexValue = (value: string): string => {
  if (
    value.length === 7
    && value[1] === value[2]
    && value[3] === value[4]
    && value[5] === value[6]
  ) {
    return `#${value[1]}${value[3]}${value[5]}`
  }
  return value
}

export default reduceHexValue
