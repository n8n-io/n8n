Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const http = require('../http.js');
const amqplib = require('./amqplib.js');
const index$6 = require('./anthropic-ai/index.js');
const connect = require('./connect.js');
const express = require('./express.js');
const index = require('./fastify/index.js');
const firebase = require('./firebase/firebase.js');
const genericPool = require('./genericPool.js');
const index$7 = require('./google-genai/index.js');
const graphql = require('./graphql.js');
const index$1 = require('./hapi/index.js');
const index$2 = require('./hono/index.js');
const kafka = require('./kafka.js');
const koa = require('./koa.js');
const index$3 = require('./langchain/index.js');
const index$8 = require('./langgraph/index.js');
const lrumemoizer = require('./lrumemoizer.js');
const mongo = require('./mongo.js');
const mongoose = require('./mongoose.js');
const mysql = require('./mysql.js');
const mysql2 = require('./mysql2.js');
const index$5 = require('./openai/index.js');
const postgres = require('./postgres.js');
const postgresjs = require('./postgresjs.js');
const prisma = require('./prisma.js');
const redis = require('./redis.js');
const tedious = require('./tedious.js');
const index$4 = require('./vercelai/index.js');

/**
 * With OTEL, all performance integrations will be added, as OTEL only initializes them when the patched package is actually required.
 */
function getAutoPerformanceIntegrations() {
  return [
    express.expressIntegration(),
    index.fastifyIntegration(),
    graphql.graphqlIntegration(),
    index$2.honoIntegration(),
    mongo.mongoIntegration(),
    mongoose.mongooseIntegration(),
    mysql.mysqlIntegration(),
    mysql2.mysql2Integration(),
    redis.redisIntegration(),
    postgres.postgresIntegration(),
    prisma.prismaIntegration(),
    index$1.hapiIntegration(),
    koa.koaIntegration(),
    connect.connectIntegration(),
    tedious.tediousIntegration(),
    genericPool.genericPoolIntegration(),
    kafka.kafkaIntegration(),
    amqplib.amqplibIntegration(),
    lrumemoizer.lruMemoizerIntegration(),
    // AI providers
    // LangChain must come first to disable AI provider integrations before they instrument
    index$3.langChainIntegration(),
    index$8.langGraphIntegration(),
    index$4.vercelAIIntegration(),
    index$5.openAIIntegration(),
    index$6.anthropicAIIntegration(),
    index$7.googleGenAIIntegration(),
    postgresjs.postgresJsIntegration(),
    firebase.firebaseIntegration(),
  ];
}

/**
 * Get a list of methods to instrument OTEL, when preload instrumentation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getOpenTelemetryInstrumentationToPreload() {
  return [
    http.instrumentSentryHttp,
    http.instrumentOtelHttp,
    express.instrumentExpress,
    connect.instrumentConnect,
    index.instrumentFastify,
    index.instrumentFastifyV3,
    index$1.instrumentHapi,
    index$2.instrumentHono,
    kafka.instrumentKafka,
    koa.instrumentKoa,
    lrumemoizer.instrumentLruMemoizer,
    mongo.instrumentMongo,
    mongoose.instrumentMongoose,
    mysql.instrumentMysql,
    mysql2.instrumentMysql2,
    postgres.instrumentPostgres,
    index$1.instrumentHapi,
    graphql.instrumentGraphql,
    redis.instrumentRedis,
    tedious.instrumentTedious,
    genericPool.instrumentGenericPool,
    amqplib.instrumentAmqplib,
    index$3.instrumentLangChain,
    index$4.instrumentVercelAi,
    index$5.instrumentOpenAi,
    postgresjs.instrumentPostgresJs,
    firebase.instrumentFirebase,
    index$6.instrumentAnthropicAi,
    index$7.instrumentGoogleGenAI,
    index$8.instrumentLangGraph,
  ];
}

exports.getAutoPerformanceIntegrations = getAutoPerformanceIntegrations;
exports.getOpenTelemetryInstrumentationToPreload = getOpenTelemetryInstrumentationToPreload;
//# sourceMappingURL=index.js.map
