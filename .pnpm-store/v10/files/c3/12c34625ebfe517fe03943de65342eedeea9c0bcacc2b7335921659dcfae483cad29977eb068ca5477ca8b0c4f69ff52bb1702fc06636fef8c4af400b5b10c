/**
 * Validate a topic to see if it's valid or not.
 * A topic is valid if it follow below rules:
 * - Rule #1: If any part of the topic is not `+` or `#`, then it must not contain `+` and '#'
 * - Rule #2: Part `#` must be located at the end of the mailbox
 *
 * @param {String} topic - A topic
 * @returns {Boolean} If the topic is valid, returns true. Otherwise, returns false.
 */
export function validateTopic(topic: string): boolean {
	const parts = topic.split('/')

	for (let i = 0; i < parts.length; i++) {
		if (parts[i] === '+') {
			continue
		}

		if (parts[i] === '#') {
			// for Rule #2
			return i === parts.length - 1
		}

		if (parts[i].indexOf('+') !== -1 || parts[i].indexOf('#') !== -1) {
			return false
		}
	}

	return true
}

/**
 * Validate an array of topics to see if any of them is valid or not
 * @param {Array} topics - Array of topics
 * @returns {String} If the topics is valid, returns null. Otherwise, returns the invalid one
 */
export function validateTopics(topics: string[]): string {
	if (topics.length === 0) {
		return 'empty_topic_list'
	}
	for (let i = 0; i < topics.length; i++) {
		if (!validateTopic(topics[i])) {
			return topics[i]
		}
	}
	return null
}
