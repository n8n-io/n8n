import { instrumentSentryHttp, instrumentOtelHttp } from '../http.js';
import { instrumentAmqplib, amqplibIntegration } from './amqplib.js';
import { instrumentAnthropicAi, anthropicAIIntegration } from './anthropic-ai/index.js';
import { instrumentConnect, connectIntegration } from './connect.js';
import { instrumentExpress, expressIntegration } from './express.js';
import { instrumentFastify, instrumentFastifyV3, fastifyIntegration } from './fastify/index.js';
import { instrumentFirebase, firebaseIntegration } from './firebase/firebase.js';
import { instrumentGenericPool, genericPoolIntegration } from './genericPool.js';
import { instrumentGoogleGenAI, googleGenAIIntegration } from './google-genai/index.js';
import { instrumentGraphql, graphqlIntegration } from './graphql.js';
import { instrumentHapi, hapiIntegration } from './hapi/index.js';
import { instrumentHono, honoIntegration } from './hono/index.js';
import { instrumentKafka, kafkaIntegration } from './kafka.js';
import { instrumentKoa, koaIntegration } from './koa.js';
import { instrumentLangChain, langChainIntegration } from './langchain/index.js';
import { instrumentLangGraph, langGraphIntegration } from './langgraph/index.js';
import { instrumentLruMemoizer, lruMemoizerIntegration } from './lrumemoizer.js';
import { instrumentMongo, mongoIntegration } from './mongo.js';
import { instrumentMongoose, mongooseIntegration } from './mongoose.js';
import { instrumentMysql, mysqlIntegration } from './mysql.js';
import { instrumentMysql2, mysql2Integration } from './mysql2.js';
import { instrumentOpenAi, openAIIntegration } from './openai/index.js';
import { instrumentPostgres, postgresIntegration } from './postgres.js';
import { instrumentPostgresJs, postgresJsIntegration } from './postgresjs.js';
import { prismaIntegration } from './prisma.js';
import { instrumentRedis, redisIntegration } from './redis.js';
import { instrumentTedious, tediousIntegration } from './tedious.js';
import { instrumentVercelAi, vercelAIIntegration } from './vercelai/index.js';

/**
 * With OTEL, all performance integrations will be added, as OTEL only initializes them when the patched package is actually required.
 */
function getAutoPerformanceIntegrations() {
  return [
    expressIntegration(),
    fastifyIntegration(),
    graphqlIntegration(),
    honoIntegration(),
    mongoIntegration(),
    mongooseIntegration(),
    mysqlIntegration(),
    mysql2Integration(),
    redisIntegration(),
    postgresIntegration(),
    prismaIntegration(),
    hapiIntegration(),
    koaIntegration(),
    connectIntegration(),
    tediousIntegration(),
    genericPoolIntegration(),
    kafkaIntegration(),
    amqplibIntegration(),
    lruMemoizerIntegration(),
    // AI providers
    // LangChain must come first to disable AI provider integrations before they instrument
    langChainIntegration(),
    langGraphIntegration(),
    vercelAIIntegration(),
    openAIIntegration(),
    anthropicAIIntegration(),
    googleGenAIIntegration(),
    postgresJsIntegration(),
    firebaseIntegration(),
  ];
}

/**
 * Get a list of methods to instrument OTEL, when preload instrumentation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getOpenTelemetryInstrumentationToPreload() {
  return [
    instrumentSentryHttp,
    instrumentOtelHttp,
    instrumentExpress,
    instrumentConnect,
    instrumentFastify,
    instrumentFastifyV3,
    instrumentHapi,
    instrumentHono,
    instrumentKafka,
    instrumentKoa,
    instrumentLruMemoizer,
    instrumentMongo,
    instrumentMongoose,
    instrumentMysql,
    instrumentMysql2,
    instrumentPostgres,
    instrumentHapi,
    instrumentGraphql,
    instrumentRedis,
    instrumentTedious,
    instrumentGenericPool,
    instrumentAmqplib,
    instrumentLangChain,
    instrumentVercelAi,
    instrumentOpenAi,
    instrumentPostgresJs,
    instrumentFirebase,
    instrumentAnthropicAi,
    instrumentGoogleGenAI,
    instrumentLangGraph,
  ];
}

export { getAutoPerformanceIntegrations, getOpenTelemetryInstrumentationToPreload };
//# sourceMappingURL=index.js.map
