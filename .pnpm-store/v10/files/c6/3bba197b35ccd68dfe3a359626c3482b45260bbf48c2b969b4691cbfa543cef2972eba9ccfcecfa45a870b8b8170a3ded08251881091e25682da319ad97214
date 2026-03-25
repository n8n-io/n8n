import { IAuthPacket } from 'mqtt-packet'
import { ErrorWithReasonCode, PacketHandler } from '../shared'
import { ReasonCodes } from './ack'

const handleAuth: PacketHandler = (
	client,
	packet: IAuthPacket & { returnCode: number },
) => {
	const { options } = client
	const version = options.protocolVersion
	const rc = version === 5 ? packet.reasonCode : packet.returnCode

	if (version !== 5) {
		const err = new ErrorWithReasonCode(
			`Protocol error: Auth packets are only supported in MQTT 5. Your version:${version}`,
			rc,
		)
		client.emit('error', err)
		return
	}

	client.handleAuth(
		packet,
		(err: ErrorWithReasonCode, packet2: IAuthPacket) => {
			if (err) {
				client.emit('error', err)
				return
			}

			if (rc === 24) {
				client.reconnecting = false
				client['_sendPacket'](packet2)
			} else {
				const error = new ErrorWithReasonCode(
					`Connection refused: ${ReasonCodes[rc]}`,
					rc,
				)
				client.emit('error', error)
			}
		},
	)
}

export default handleAuth
