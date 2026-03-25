/**
 * Topic Alias receiving manager
 * This holds alias to topic map
 * @param {Number} [max] - topic alias maximum entries
 */
export default class TopicAliasRecv {
	private aliasToTopic: Record<number, string>

	public max: number

	public length: number

	constructor(max: number) {
		this.aliasToTopic = {}
		this.max = max
	}

	/**
	 * Insert or update topic - alias entry.
	 * @param {String} [topic] - topic
	 * @param {Number} [alias] - topic alias
	 * @returns {Boolean} - if success return true otherwise false
	 */
	put(topic: string, alias: number): boolean {
		if (alias === 0 || alias > this.max) {
			return false
		}
		this.aliasToTopic[alias] = topic
		this.length = Object.keys(this.aliasToTopic).length
		return true
	}

	/**
	 * Get topic by alias
	 * @param {String} [topic] - topic
	 * @returns {Number} - if mapped topic exists return topic alias, otherwise return undefined
	 */
	getTopicByAlias(alias: number): string {
		return this.aliasToTopic[alias]
	}

	/**
	 * Clear all entries
	 */
	clear() {
		this.aliasToTopic = {}
	}
}
