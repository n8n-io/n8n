/**
 * @private
 * Normalizes an incoming payload by converting the `bot` property in `relatesTo` to `agent`.
 * This ensures compatibility with the activity wire protocol.
 *
 * @param payload - The incoming payload object to normalize.
 * @returns The normalized payload object with `bot` replaced by `agent` in `relatesTo`.
 */
export function normalizeIncomingActivity (payload: any): object {
  if (payload['relatesTo'] && payload['relatesTo']['bot']) {
    const relatesTo = payload['relatesTo']
    const ov = relatesTo['bot']
    delete relatesTo['bot']
    relatesTo['agent'] = ov
  }
  return payload
}

/**
 * @private
 * Normalizes an outgoing payload by converting the `agent` property in `relatesTo` to `bot`.
 * This ensures compatibility with the activity wire protocol.
 *
 * @param payload - The outgoing payload object to normalize.
 * @returns The normalized payload object with `agent` replaced by `bot` in `relatesTo`.
 */
export function normalizeOutgoingActivity (payload: any): object | undefined | null {
  if (!payload) {
    return payload
  }
  const modifiedPayload = JSON.parse(JSON.stringify(payload))
  if (modifiedPayload && modifiedPayload['relatesTo'] && modifiedPayload['relatesTo']['agent']) {
    const relatesTo = modifiedPayload['relatesTo']
    const ov = relatesTo['agent']
    delete relatesTo['agent']
    relatesTo['bot'] = ov
  }
  if (modifiedPayload && modifiedPayload['_channelId']) {
    modifiedPayload['channelId'] = modifiedPayload['_channelId'].toString()
    delete modifiedPayload['_channelId']
  }
  return modifiedPayload
}

export function normalizeTokenExchangeState (payload: any): object {
  if (payload['conversation'] && payload['conversation']['agent']) {
    const conversation = payload['conversation']
    const ov = conversation['agent']
    delete conversation['agent']
    conversation['bot'] = ov
  }
  return payload
}
