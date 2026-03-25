const pkgJson = require('../package.json')
const { bugs } = pkgJson

class KafkaJSError extends Error {
  constructor(e, { retriable = true, cause } = {}) {
    super(e, { cause })
    Error.captureStackTrace(this, this.constructor)
    this.message = e.message || e
    this.name = 'KafkaJSError'
    this.retriable = retriable
    this.helpUrl = e.helpUrl
    this.cause = cause
  }
}

class KafkaJSNonRetriableError extends KafkaJSError {
  constructor(e, { cause } = {}) {
    super(e, { retriable: false, cause })
    this.name = 'KafkaJSNonRetriableError'
  }
}

class KafkaJSProtocolError extends KafkaJSError {
  constructor(e, { retriable = e.retriable } = {}) {
    super(e, { retriable })
    this.type = e.type
    this.code = e.code
    this.name = 'KafkaJSProtocolError'
  }
}

class KafkaJSOffsetOutOfRange extends KafkaJSProtocolError {
  constructor(e, { topic, partition }) {
    super(e)
    this.topic = topic
    this.partition = partition
    this.name = 'KafkaJSOffsetOutOfRange'
  }
}

class KafkaJSMemberIdRequired extends KafkaJSProtocolError {
  constructor(e, { memberId }) {
    super(e)
    this.memberId = memberId
    this.name = 'KafkaJSMemberIdRequired'
  }
}

class KafkaJSNumberOfRetriesExceeded extends KafkaJSNonRetriableError {
  constructor(e, { retryCount, retryTime }) {
    super(e, { cause: e })
    this.stack = `${this.name}\n  Caused by: ${e.stack}`
    this.retryCount = retryCount
    this.retryTime = retryTime
    this.name = 'KafkaJSNumberOfRetriesExceeded'
  }
}

class KafkaJSConnectionError extends KafkaJSError {
  /**
   * @param {string} e
   * @param {object} options
   * @param {string} [options.broker]
   * @param {string} [options.code]
   */
  constructor(e, { broker, code } = {}) {
    super(e)
    this.broker = broker
    this.code = code
    this.name = 'KafkaJSConnectionError'
  }
}

class KafkaJSConnectionClosedError extends KafkaJSConnectionError {
  constructor(e, { host, port } = {}) {
    super(e, { broker: `${host}:${port}` })
    this.host = host
    this.port = port
    this.name = 'KafkaJSConnectionClosedError'
  }
}

class KafkaJSRequestTimeoutError extends KafkaJSError {
  constructor(e, { broker, correlationId, createdAt, sentAt, pendingDuration } = {}) {
    super(e)
    this.broker = broker
    this.correlationId = correlationId
    this.createdAt = createdAt
    this.sentAt = sentAt
    this.pendingDuration = pendingDuration
    this.name = 'KafkaJSRequestTimeoutError'
  }
}

class KafkaJSMetadataNotLoaded extends KafkaJSError {
  constructor() {
    super(...arguments)
    this.name = 'KafkaJSMetadataNotLoaded'
  }
}
class KafkaJSTopicMetadataNotLoaded extends KafkaJSMetadataNotLoaded {
  constructor(e, { topic } = {}) {
    super(e)
    this.topic = topic
    this.name = 'KafkaJSTopicMetadataNotLoaded'
  }
}
class KafkaJSStaleTopicMetadataAssignment extends KafkaJSError {
  constructor(e, { topic, unknownPartitions } = {}) {
    super(e)
    this.topic = topic
    this.unknownPartitions = unknownPartitions
    this.name = 'KafkaJSStaleTopicMetadataAssignment'
  }
}

class KafkaJSDeleteGroupsError extends KafkaJSError {
  constructor(e, groups = []) {
    super(e)
    this.groups = groups
    this.name = 'KafkaJSDeleteGroupsError'
  }
}

class KafkaJSServerDoesNotSupportApiKey extends KafkaJSNonRetriableError {
  constructor(e, { apiKey, apiName } = {}) {
    super(e)
    this.apiKey = apiKey
    this.apiName = apiName
    this.name = 'KafkaJSServerDoesNotSupportApiKey'
  }
}

class KafkaJSBrokerNotFound extends KafkaJSError {
  constructor() {
    super(...arguments)
    this.name = 'KafkaJSBrokerNotFound'
  }
}

class KafkaJSPartialMessageError extends KafkaJSNonRetriableError {
  constructor() {
    super(...arguments)
    this.name = 'KafkaJSPartialMessageError'
  }
}

class KafkaJSSASLAuthenticationError extends KafkaJSNonRetriableError {
  constructor() {
    super(...arguments)
    this.name = 'KafkaJSSASLAuthenticationError'
  }
}

class KafkaJSGroupCoordinatorNotFound extends KafkaJSNonRetriableError {
  constructor() {
    super(...arguments)
    this.name = 'KafkaJSGroupCoordinatorNotFound'
  }
}

class KafkaJSNotImplemented extends KafkaJSNonRetriableError {
  constructor() {
    super(...arguments)
    this.name = 'KafkaJSNotImplemented'
  }
}

class KafkaJSTimeout extends KafkaJSNonRetriableError {
  constructor() {
    super(...arguments)
    this.name = 'KafkaJSTimeout'
  }
}

class KafkaJSLockTimeout extends KafkaJSTimeout {
  constructor() {
    super(...arguments)
    this.name = 'KafkaJSLockTimeout'
  }
}

class KafkaJSUnsupportedMagicByteInMessageSet extends KafkaJSNonRetriableError {
  constructor() {
    super(...arguments)
    this.name = 'KafkaJSUnsupportedMagicByteInMessageSet'
  }
}

class KafkaJSDeleteTopicRecordsError extends KafkaJSError {
  constructor({ partitions }) {
    /*
     * This error is retriable if all the errors were retriable
     */
    const retriable = partitions
      .filter(({ error }) => error != null)
      .every(({ error }) => error.retriable === true)

    super('Error while deleting records', { retriable })
    this.name = 'KafkaJSDeleteTopicRecordsError'
    this.partitions = partitions
  }
}

const issueUrl = bugs ? bugs.url : null

class KafkaJSInvariantViolation extends KafkaJSNonRetriableError {
  constructor(e) {
    const message = e.message || e
    super(`Invariant violated: ${message}. This is likely a bug and should be reported.`)
    this.name = 'KafkaJSInvariantViolation'

    if (issueUrl !== null) {
      const issueTitle = encodeURIComponent(`Invariant violation: ${message}`)
      this.helpUrl = `${issueUrl}/new?assignees=&labels=bug&template=bug_report.md&title=${issueTitle}`
    }
  }
}

class KafkaJSInvalidVarIntError extends KafkaJSNonRetriableError {
  constructor() {
    super(...arguments)
    this.name = 'KafkaJSNonRetriableError'
  }
}

class KafkaJSInvalidLongError extends KafkaJSNonRetriableError {
  constructor() {
    super(...arguments)
    this.name = 'KafkaJSNonRetriableError'
  }
}

class KafkaJSCreateTopicError extends KafkaJSProtocolError {
  constructor(e, topicName) {
    super(e)
    this.topic = topicName
    this.name = 'KafkaJSCreateTopicError'
  }
}

class KafkaJSAlterPartitionReassignmentsError extends KafkaJSProtocolError {
  constructor(e, topicName, partition) {
    super(e)
    this.topic = topicName
    this.partition = partition
    this.name = 'KafkaJSAlterPartitionReassignmentsError'
  }
}

class KafkaJSAggregateError extends Error {
  constructor(message, errors) {
    super(message)
    this.errors = errors
    this.name = 'KafkaJSAggregateError'
  }
}

class KafkaJSFetcherRebalanceError extends Error {}

class KafkaJSNoBrokerAvailableError extends KafkaJSError {
  constructor() {
    super('No broker available')
    this.name = 'KafkaJSNoBrokerAvailableError'
  }
}

const isRebalancing = e =>
  e.type === 'REBALANCE_IN_PROGRESS' ||
  e.type === 'NOT_COORDINATOR_FOR_GROUP' ||
  e.type === 'ILLEGAL_GENERATION'

const isKafkaJSError = e => e instanceof KafkaJSError

module.exports = {
  KafkaJSError,
  KafkaJSNonRetriableError,
  KafkaJSPartialMessageError,
  KafkaJSBrokerNotFound,
  KafkaJSProtocolError,
  KafkaJSConnectionError,
  KafkaJSConnectionClosedError,
  KafkaJSRequestTimeoutError,
  KafkaJSSASLAuthenticationError,
  KafkaJSNumberOfRetriesExceeded,
  KafkaJSOffsetOutOfRange,
  KafkaJSMemberIdRequired,
  KafkaJSGroupCoordinatorNotFound,
  KafkaJSNotImplemented,
  KafkaJSMetadataNotLoaded,
  KafkaJSTopicMetadataNotLoaded,
  KafkaJSStaleTopicMetadataAssignment,
  KafkaJSDeleteGroupsError,
  KafkaJSTimeout,
  KafkaJSLockTimeout,
  KafkaJSServerDoesNotSupportApiKey,
  KafkaJSUnsupportedMagicByteInMessageSet,
  KafkaJSDeleteTopicRecordsError,
  KafkaJSInvariantViolation,
  KafkaJSInvalidVarIntError,
  KafkaJSInvalidLongError,
  KafkaJSCreateTopicError,
  KafkaJSAggregateError,
  KafkaJSFetcherRebalanceError,
  KafkaJSNoBrokerAvailableError,
  KafkaJSAlterPartitionReassignmentsError,
  isRebalancing,
  isKafkaJSError,
}
