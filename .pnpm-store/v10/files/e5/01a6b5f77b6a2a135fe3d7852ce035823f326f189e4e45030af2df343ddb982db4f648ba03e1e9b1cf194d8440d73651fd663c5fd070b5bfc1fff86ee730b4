import { IPublishPacket } from 'mqtt-packet'
import { PacketHandler } from '../shared'

const validReasonCodes = [0, 16, 128, 131, 135, 144, 145, 151, 153]

/*
  those late 2 case should be rewrite to comply with coding style:

  case 1:
  case 0:
    // do not wait sending a puback
    // no callback passed
    if (1 === qos) {
      this._sendPacket({
        cmd: 'puback',
        messageId: messageId
      });
    }
    // emit the message event for both qos 1 and 0
    this.emit('message', topic, message, packet);
    this.handleMessage(packet, done);
    break;
  default:
    // do nothing but every switch mus have a default
    // log or throw an error about unknown qos
    break;

  for now i just suppressed the warnings
  */
const handlePublish: PacketHandler = (client, packet: IPublishPacket, done) => {
	client.log('handlePublish: packet %o', packet)
	done = typeof done !== 'undefined' ? done : client.noop
	let topic = packet.topic.toString()
	const message = packet.payload
	const { qos } = packet
	const { messageId } = packet
	const { options } = client
	if (client.options.protocolVersion === 5) {
		let alias: number
		if (packet.properties) {
			alias = packet.properties.topicAlias
		}
		if (typeof alias !== 'undefined') {
			if (topic.length === 0) {
				if (alias > 0 && alias <= 0xffff) {
					const gotTopic =
						client['topicAliasRecv'].getTopicByAlias(alias)
					if (gotTopic) {
						topic = gotTopic
						client.log(
							'handlePublish :: topic complemented by alias. topic: %s - alias: %d',
							topic,
							alias,
						)
					} else {
						client.log(
							'handlePublish :: unregistered topic alias. alias: %d',
							alias,
						)
						client.emit(
							'error',
							new Error('Received unregistered Topic Alias'),
						)
						return
					}
				} else {
					client.log(
						'handlePublish :: topic alias out of range. alias: %d',
						alias,
					)
					client.emit(
						'error',
						new Error('Received Topic Alias is out of range'),
					)
					return
				}
			} else if (client['topicAliasRecv'].put(topic, alias)) {
				client.log(
					'handlePublish :: registered topic: %s - alias: %d',
					topic,
					alias,
				)
			} else {
				client.log(
					'handlePublish :: topic alias out of range. alias: %d',
					alias,
				)
				client.emit(
					'error',
					new Error('Received Topic Alias is out of range'),
				)
				return
			}
		}
	}
	client.log('handlePublish: qos %d', qos)
	switch (qos) {
		case 2: {
			options.customHandleAcks(
				topic,
				message as Buffer,
				packet,
				(error, code) => {
					if (typeof error === 'number') {
						code = error
						error = null
					}
					if (error) {
						return client.emit('error', error as Error)
					}
					if (validReasonCodes.indexOf(code) === -1) {
						return client.emit(
							'error',
							new Error('Wrong reason code for pubrec'),
						)
					}
					if (code) {
						client['_sendPacket'](
							{ cmd: 'pubrec', messageId, reasonCode: code },
							done,
						)
					} else {
						client.incomingStore.put(packet, () => {
							client['_sendPacket'](
								{ cmd: 'pubrec', messageId },
								done,
							)
						})
					}
				},
			)
			break
		}
		case 1: {
			// emit the message event
			options.customHandleAcks(
				topic,
				message as Buffer,
				packet,
				(error, code) => {
					if (typeof error === 'number') {
						code = error
						error = null
					}
					if (error) {
						return client.emit('error', error as Error)
					}
					if (validReasonCodes.indexOf(code) === -1) {
						return client.emit(
							'error',
							new Error('Wrong reason code for puback'),
						)
					}
					if (!code) {
						client.emit('message', topic, message as Buffer, packet)
					}
					client.handleMessage(packet, (err) => {
						if (err) {
							return done && done(err)
						}
						client['_sendPacket'](
							{ cmd: 'puback', messageId, reasonCode: code },
							done,
						)
					})
				},
			)
			break
		}
		case 0:
			// emit the message event
			client.emit('message', topic, message as Buffer, packet)
			client.handleMessage(packet, done)
			break
		default:
			// do nothing
			client.log('handlePublish: unknown QoS. Doing nothing.')
			// log or throw an error about unknown qos
			break
	}
}

export default handlePublish
