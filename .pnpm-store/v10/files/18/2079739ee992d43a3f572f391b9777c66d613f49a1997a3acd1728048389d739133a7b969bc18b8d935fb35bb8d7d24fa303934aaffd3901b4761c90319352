const apiKeys = require('./apiKeys')
const { KafkaJSServerDoesNotSupportApiKey, KafkaJSNotImplemented } = require('../../errors')

/**
 * @typedef {(options?: Object) => { request: any, response: any, logResponseErrors?: boolean }} Request
 */

/**
 * @typedef {Object} RequestDefinitions
 * @property {string[]} versions
 * @property {({ version: number }) => Request} protocol
 */

/**
 * @typedef {(apiKey: number, definitions: RequestDefinitions) => Request} Lookup
 */

/** @type {RequestDefinitions} */
const noImplementedRequestDefinitions = {
  versions: [],
  protocol: () => {
    throw new KafkaJSNotImplemented()
  },
}

/**
 * @type {{[apiName: string]: RequestDefinitions}}
 */
const requests = {
  Produce: require('./produce'),
  Fetch: require('./fetch'),
  ListOffsets: require('./listOffsets'),
  Metadata: require('./metadata'),
  LeaderAndIsr: noImplementedRequestDefinitions,
  StopReplica: noImplementedRequestDefinitions,
  UpdateMetadata: noImplementedRequestDefinitions,
  ControlledShutdown: noImplementedRequestDefinitions,
  OffsetCommit: require('./offsetCommit'),
  OffsetFetch: require('./offsetFetch'),
  GroupCoordinator: require('./findCoordinator'),
  JoinGroup: require('./joinGroup'),
  Heartbeat: require('./heartbeat'),
  LeaveGroup: require('./leaveGroup'),
  SyncGroup: require('./syncGroup'),
  DescribeGroups: require('./describeGroups'),
  ListGroups: require('./listGroups'),
  SaslHandshake: require('./saslHandshake'),
  ApiVersions: require('./apiVersions'),
  CreateTopics: require('./createTopics'),
  DeleteTopics: require('./deleteTopics'),
  DeleteRecords: require('./deleteRecords'),
  InitProducerId: require('./initProducerId'),
  OffsetForLeaderEpoch: noImplementedRequestDefinitions,
  AddPartitionsToTxn: require('./addPartitionsToTxn'),
  AddOffsetsToTxn: require('./addOffsetsToTxn'),
  EndTxn: require('./endTxn'),
  WriteTxnMarkers: noImplementedRequestDefinitions,
  TxnOffsetCommit: require('./txnOffsetCommit'),
  DescribeAcls: require('./describeAcls'),
  CreateAcls: require('./createAcls'),
  DeleteAcls: require('./deleteAcls'),
  DescribeConfigs: require('./describeConfigs'),
  AlterConfigs: require('./alterConfigs'),
  AlterReplicaLogDirs: noImplementedRequestDefinitions,
  DescribeLogDirs: noImplementedRequestDefinitions,
  SaslAuthenticate: require('./saslAuthenticate'),
  CreatePartitions: require('./createPartitions'),
  CreateDelegationToken: noImplementedRequestDefinitions,
  RenewDelegationToken: noImplementedRequestDefinitions,
  ExpireDelegationToken: noImplementedRequestDefinitions,
  DescribeDelegationToken: noImplementedRequestDefinitions,
  DeleteGroups: require('./deleteGroups'),
  ElectLeaders: noImplementedRequestDefinitions,
  IncrementalAlterConfigs: noImplementedRequestDefinitions,
  AlterPartitionReassignments: require('./alterPartitionReassignments'),
  ListPartitionReassignments: require('./listPartitionReassignments'),
}

const names = Object.keys(apiKeys)
const keys = Object.values(apiKeys)
const findApiName = apiKey => names[keys.indexOf(apiKey)]

/**
 * @param {import("../../../types").ApiVersions} versions
 * @returns {Lookup}
 */
const lookup = versions => (apiKey, definition) => {
  const version = versions[apiKey]
  const availableVersions = definition.versions.map(Number)
  const bestImplementedVersion = Math.max(...availableVersions)

  if (!version || version.maxVersion == null) {
    throw new KafkaJSServerDoesNotSupportApiKey(
      `The Kafka server does not support the requested API version`,
      { apiKey, apiName: findApiName(apiKey) }
    )
  }

  const bestSupportedVersion = Math.min(bestImplementedVersion, version.maxVersion)
  return definition.protocol({ version: bestSupportedVersion })
}

module.exports = {
  requests,
  lookup,
}
