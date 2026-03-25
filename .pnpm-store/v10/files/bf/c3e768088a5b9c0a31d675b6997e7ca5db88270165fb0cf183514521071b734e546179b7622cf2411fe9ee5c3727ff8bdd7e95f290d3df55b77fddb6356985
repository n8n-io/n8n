// Other Socket Errors: EADDRINUSE, ECONNRESET, ENOTFOUND, ETIMEDOUT.

import { PacketHandler } from '../shared'

export const ReasonCodes = {
	0: '',
	1: 'Unacceptable protocol version',
	2: 'Identifier rejected',
	3: 'Server unavailable',
	4: 'Bad username or password',
	5: 'Not authorized',
	16: 'No matching subscribers',
	17: 'No subscription existed',
	128: 'Unspecified error',
	129: 'Malformed Packet',
	130: 'Protocol Error',
	131: 'Implementation specific error',
	132: 'Unsupported Protocol Version',
	133: 'Client Identifier not valid',
	134: 'Bad User Name or Password',
	135: 'Not authorized',
	136: 'Server unavailable',
	137: 'Server busy',
	138: 'Banned',
	139: 'Server shutting down',
	140: 'Bad authentication method',
	141: 'Keep Alive timeout',
	142: 'Session taken over',
	143: 'Topic Filter invalid',
	144: 'Topic Name invalid',
	145: 'Packet identifier in use',
	146: 'Packet Identifier not found',
	147: 'Receive Maximum exceeded',
	148: 'Topic Alias invalid',
	149: 'Packet too large',
	150: 'Message rate too high',
	151: 'Quota exceeded',
	152: 'Administrative action',
	153: 'Payload format invalid',
	154: 'Retain not supported',
	155: 'QoS not supported',
	156: 'Use another server',
	157: 'Server moved',
	158: 'Shared Subscriptions not supported',
	159: 'Connection rate exceeded',
	160: 'Maximum connect time',
	161: 'Subscription Identifiers not supported',
	162: 'Wildcard Subscriptions not supported',
}

const handleAck: PacketHandler = (client, packet) => {
	/* eslint no-fallthrough: "off" */
	const { messageId } = packet
	const type = packet.cmd
	let response = null
	const cb = client.outgoing[messageId] ? client.outgoing[messageId].cb : null
	let err = null

	// Checking `!cb` happens to work, but it's not technically "correct".
	//
	// Why? client code assumes client "no callback" is the same as client "we're not
	// waiting for responses" (puback, pubrec, pubcomp, suback, or unsuback).
	//
	// It would be better to check `if (!client.outgoing[messageId])` here, but
	// there's no reason to change it and risk (another) regression.
	//
	// The only reason client code works is becaues code in MqttClient.publish,
	// MqttClinet.subscribe, and MqttClient.unsubscribe ensures client we will
	// have a callback even if the user doesn't pass one in.)
	if (!cb) {
		client.log('_handleAck :: Server sent an ack in error. Ignoring.')
		// Server sent an ack in error, ignore it.
		return
	}

	// Process
	client.log('_handleAck :: packet type', type)
	switch (type) {
		case 'pubcomp':
		// same thing as puback for QoS 2
		case 'puback': {
			const pubackRC = packet.reasonCode
			// Callback - we're done
			if (pubackRC && pubackRC > 0 && pubackRC !== 16) {
				err = new Error(`Publish error: ${ReasonCodes[pubackRC]}`)
				err.code = pubackRC
				client['_removeOutgoingAndStoreMessage'](messageId, () => {
					cb(err, packet)
				})
			} else {
				client['_removeOutgoingAndStoreMessage'](messageId, cb)
			}

			break
		}
		case 'pubrec': {
			response = {
				cmd: 'pubrel',
				qos: 2,
				messageId,
			}
			const pubrecRC = packet.reasonCode

			if (pubrecRC && pubrecRC > 0 && pubrecRC !== 16) {
				err = new Error(`Publish error: ${ReasonCodes[pubrecRC]}`)
				err.code = pubrecRC
				client['_removeOutgoingAndStoreMessage'](messageId, () => {
					cb(err, packet)
				})
			} else {
				client['_sendPacket'](response)
			}
			break
		}
		case 'suback': {
			delete client.outgoing[messageId]
			client.messageIdProvider.deallocate(messageId)
			const granted = packet.granted as number[]
			for (let grantedI = 0; grantedI < granted.length; grantedI++) {
				const subackRC = granted[grantedI]
				if ((subackRC & 0x80) !== 0) {
					err = new Error(`Subscribe error: ${ReasonCodes[subackRC]}`)
					err.code = subackRC

					// suback with Failure status
					const topics = client.messageIdToTopic[messageId]
					if (topics) {
						topics.forEach((topic) => {
							delete client['_resubscribeTopics'][topic]
						})
					}
				}
			}
			delete client.messageIdToTopic[messageId]
			client['_invokeStoreProcessingQueue']()
			cb(err, packet)
			break
		}
		case 'unsuback': {
			delete client.outgoing[messageId]
			client.messageIdProvider.deallocate(messageId)
			client['_invokeStoreProcessingQueue']()
			cb(null)
			break
		}
		default:
			client.emit('error', new Error('unrecognized packet type'))
	}

	if (client.disconnecting && Object.keys(client.outgoing).length === 0) {
		client.emit('outgoingEmpty')
	}
}

export default handleAck
