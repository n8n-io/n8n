import { getCurrentScope, getIsolationScope } from '../currentScopes.js';
import { defineIntegration } from '../integration.js';
import { GEN_AI_CONVERSATION_ID_ATTRIBUTE } from '../semanticAttributes.js';

const INTEGRATION_NAME = 'ConversationId';

const _conversationIdIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setup(client) {
      client.on('spanStart', (span) => {
        const scopeData = getCurrentScope().getScopeData();
        const isolationScopeData = getIsolationScope().getScopeData();

        const conversationId = scopeData.conversationId || isolationScopeData.conversationId;

        if (conversationId) {
          span.setAttribute(GEN_AI_CONVERSATION_ID_ATTRIBUTE, conversationId);
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
const conversationIdIntegration = defineIntegration(_conversationIdIntegration);

export { conversationIdIntegration };
//# sourceMappingURL=conversationId.js.map
