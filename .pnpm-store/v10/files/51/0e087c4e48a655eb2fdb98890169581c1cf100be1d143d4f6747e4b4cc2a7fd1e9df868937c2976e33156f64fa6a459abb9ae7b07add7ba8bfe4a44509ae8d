"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeJWT = void 0;
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("@microsoft/agents-activity/logger");
const logger = (0, logger_1.debug)('agents:jwt-middleware');
/**
 * Verifies the JWT token.
 * @param raw The raw JWT token.
 * @param config The authentication configuration.
 * @returns A promise that resolves to the JWT payload.
 */
const verifyToken = async (raw, config) => {
    const payload = jsonwebtoken_1.default.decode(raw);
    logger.debug('jwt.decode ', JSON.stringify(payload));
    if (!payload) {
        throw new Error('invalid token');
    }
    const audience = payload.aud;
    const matchingEntry = config.connections && config.connections.size > 0
        ? [...config.connections.entries()].find(([_, configuration]) => configuration.clientId === audience)
        : undefined;
    if (!matchingEntry) {
        const err = new Error('Audience mismatch');
        logger.error(err.message, audience);
        throw err;
    }
    const [key, authConfig] = matchingEntry;
    logger.debug(`Audience found at key: ${key}`);
    const jwksUri = payload.iss === 'https://api.botframework.com'
        ? 'https://login.botframework.com/v1/.well-known/keys'
        : `${authConfig.authority}/${authConfig.tenantId}/discovery/v2.0/keys`;
    logger.debug(`fetching keys from ${jwksUri}`);
    const jwksClient = (0, jwks_rsa_1.default)({ jwksUri });
    const getKey = (header, callback) => {
        jwksClient.getSigningKey(header.kid, (err, key) => {
            if (err) {
                logger.error('jwksClient.getSigningKey ', JSON.stringify(err));
                logger.error(JSON.stringify(err));
                callback(err, undefined);
                return;
            }
            const signingKey = key === null || key === void 0 ? void 0 : key.getPublicKey();
            callback(null, signingKey);
        });
    };
    const verifyOptions = {
        issuer: authConfig.issuers,
        audience: [authConfig.clientId, 'https://api.botframework.com'],
        ignoreExpiration: false,
        algorithms: ['RS256'],
        clockTolerance: 300
    };
    return await new Promise((resolve, reject) => {
        jsonwebtoken_1.default.verify(raw, getKey, verifyOptions, (err, user) => {
            if (err) {
                logger.error('jwt.verify ', JSON.stringify(err));
                reject(err);
                return;
            }
            resolve(user);
        });
    });
};
/**
 * Middleware to authorize JWT tokens.
 * @param authConfig The authentication configuration.
 * @returns An Express middleware function.
 */
const authorizeJWT = (authConfig) => {
    return async function (req, res, next) {
        let failed = false;
        logger.debug('authorizing jwt');
        if (req.method !== 'POST' && req.method !== 'GET') {
            failed = true;
            logger.warn('Method not allowed', req.method);
            res.status(405).send({ 'jwt-auth-error': 'Method not allowed' });
        }
        else {
            const authHeader = req.headers.authorization;
            if (authHeader) {
                const token = authHeader.split(' ')[1]; // Extract the token from the Bearer string
                try {
                    const user = await verifyToken(token, authConfig);
                    logger.debug('token verified for ', user);
                    req.user = user;
                }
                catch (err) {
                    failed = true;
                    logger.error(err);
                    res.status(401).send({ 'jwt-auth-error': err.message });
                }
            }
            else {
                if (!authConfig.clientId && process.env.NODE_ENV !== 'production') {
                    logger.info('using anonymous auth');
                    req.user = { name: 'anonymous' };
                }
                else {
                    failed = true;
                    logger.error('authorization header not found');
                    res.status(401).send({ 'jwt-auth-error': 'authorization header not found' });
                }
            }
        }
        if (!failed) {
            next();
        }
    };
};
exports.authorizeJWT = authorizeJWT;
//# sourceMappingURL=jwt-middleware.js.map