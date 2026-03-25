import { IPubcompPacket, IPublishPacket, IPubrelPacket } from 'mqtt-packet'
import { PacketHandler } from '../shared'

const handlePubrel: PacketHandler = (client, packet: IPubrelPacket, done) => {
	client.log('handling pubrel packet')
	const callback = typeof done !== 'undefined' ? done : client.noop
	const { messageId } = packet

	const comp: IPubcompPacket = { cmd: 'pubcomp', messageId }

	client.incomingStore.get(packet, (err, pub: IPublishPacket) => {
		if (!err) {
			client.emit('message', pub.topic, pub.payload as Buffer, pub)
			client.handleMessage(pub, (err2) => {
				if (err2) {
					return callback(err2)
				}
				client.incomingStore.del(pub, client.noop)
				client['_sendPacket'](comp, callback)
			})
		} else {
			client['_sendPacket'](comp, callback)
		}
	})
}

export default handlePubrel
