export interface IMessageIdProvider {
	/**
	 * Allocate the first vacant messageId. The messageId become occupied status.
	 * @return {Number} - The first vacant messageId. If all messageIds are occupied, return null.
	 */
	allocate(): number | null

	/**
	 * Get the last allocated messageId.
	 * @return {Number} - messageId.
	 */
	getLastAllocated(): number | null

	/**
	 * Register the messageId. The messageId become occupied status.
	 * If the messageId has already been occupied, then return false.
	 * @param {number} num - The messageId to request use.
	 * @return {boolean} - If `num` was not occupied, then return true, otherwise return false.
	 */
	register(num: number): boolean

	/**
	 * Deallocate the messageId. The messageId become vacant status.
	 * @param {Number} num - The messageId to deallocate. The messageId must be occupied status.
	 *                       In other words, the messageId must be allocated by allocate() or
	 *                       occupied by register().
	 */
	deallocate(num: number): void

	/**
	 * Clear all occupied messageIds.
	 * The all messageIds are set to vacant status.
	 */
	clear(): void
}

/**
 * DefaultMessageAllocator constructor
 * @constructor
 */
export default class DefaultMessageIdProvider implements IMessageIdProvider {
	private nextId: number

	constructor() {
		/**
		 * MessageIDs starting with 1
		 * ensure that nextId is min. 1, see https://github.com/mqttjs/MQTT.js/issues/810
		 */
		this.nextId = Math.max(1, Math.floor(Math.random() * 65535))
	}

	/**
	 * allocate
	 *
	 * Get the next messageId.
	 * @return unsigned int
	 */
	allocate() {
		// id becomes current state of this.nextId and increments afterwards
		const id = this.nextId++
		// Ensure 16 bit unsigned int (max 65535, nextId got one higher)
		if (this.nextId === 65536) {
			this.nextId = 1
		}
		return id
	}

	/**
	 * getLastAllocated
	 * Get the last allocated messageId.
	 * @return unsigned int
	 */
	getLastAllocated() {
		return this.nextId === 1 ? 65535 : this.nextId - 1
	}

	/**
	 * register
	 * Register messageId. If success return true, otherwise return false.
	 * @param { unsigned int } - messageId to register,
	 * @return boolean
	 */
	register(messageId: number) {
		return true
	}

	/**
	 * deallocate
	 * Deallocate messageId.
	 * @param { unsigned int } - messageId to deallocate,
	 */
	deallocate(messageId: number) {}

	/**
	 * clear
	 * Deallocate all messageIds.
	 */
	clear() {}
}
