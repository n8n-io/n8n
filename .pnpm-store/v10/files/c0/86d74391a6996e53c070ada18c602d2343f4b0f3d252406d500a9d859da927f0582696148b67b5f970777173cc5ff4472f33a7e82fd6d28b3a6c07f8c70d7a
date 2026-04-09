Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const currentScopes = require('../currentScopes.js');
const integration = require('../integration.js');
const semanticAttributes = require('../semanticAttributes.js');

const INTEGRATION_NAME = 'ConversationId';

const _conversationIdIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setup(client) {
      client.on('spanStart', (span) => {
        const scopeData = currentScopes.getCurrentScope().getScopeData();
        const isolationScopeData = currentScopes.getIsolationScope().getScopeData();

        const conversationId = scopeData.conversationId || isolationScopeData.conversationId;

        if (conversationId) {
          span.setAttribute(semanticAttributes.GEN_AI_CONVERSATION_ID_ATTRIBUTE, conversationId);
        }
      });
    },
  };
}) ;

/**
 * Automatically applies conversation ID from scope to spans.
 *
 * This integration reads the conversation ID from the current or isolation scope
 * and applies it to spans when they start. This ensures the conversation ID is
 * available for all AI-related operations.
 */
const conversationIdIntegration = integration.defineIntegration(_conversationIdIntegration);

exports.conversationIdIntegration = conversationIdIntegration;
//# sourceMappingURL=conversationId.js.map
