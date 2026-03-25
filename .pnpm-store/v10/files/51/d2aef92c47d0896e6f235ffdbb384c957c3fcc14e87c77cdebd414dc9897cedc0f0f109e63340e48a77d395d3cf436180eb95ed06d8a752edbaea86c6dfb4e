import { ReasonCodes } from './ack'
import TopicAliasSend from '../topic-alias-send'
import { ErrorWithReasonCode, PacketHandler } from '../shared'
import { IConnackPacket } from 'mqtt-packet'

const handleConnack: PacketHandler = (client, packet: IConnackPacket) => {
	client.log('_handleConnack')
	const { options } = client
	const version = options.protocolVersion
	const rc = version === 5 ? packet.reasonCode : packet.returnCode

	clearTimeout(client['connackTimer'])
	delete client['topicAliasSend']

	if (packet.properties) {
		if (packet.properties.topicAliasMaximum) {
			if (packet.properties.topicAliasMaximum > 0xffff) {
				client.emit(
					'error',
					new Error('topicAliasMaximum from broker is out of range'),
				)
				return
			}
			if (packet.properties.topicAliasMaximum > 0) {
				client['topicAliasSend'] = new TopicAliasSend(
					packet.properties.topicAliasMaximum,
				)
			}
		}
		if (packet.properties.serverKeepAlive && options.keepalive) {
			options.keepalive = packet.properties.serverKeepAlive
		}

		if (packet.properties.maximumPacketSize) {
			if (!options.properties) {
				options.properties = {}
			}
			options.properties.maximumPacketSize =
				packet.properties.maximumPacketSize
		}
	}

	if (rc === 0) {
		client.reconnecting = false
		client['_onConnect'](packet)
	} else if (rc > 0) {
		const err = new ErrorWithReasonCode(
			`Connection refused: ${ReasonCodes[rc]}`,
			rc,
		)
		client.emit('error', err)
	}
}

export default handleConnack
