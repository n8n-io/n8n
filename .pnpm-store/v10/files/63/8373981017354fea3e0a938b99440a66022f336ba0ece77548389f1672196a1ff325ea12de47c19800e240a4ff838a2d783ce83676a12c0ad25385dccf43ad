/*
 Language: JBoss CLI
 Author: Raphaël Parrëe <rparree@edc4it.com>
 Description: language definition jboss cli
 Website: https://docs.jboss.org/author/display/WFLY/Command+Line+Interface
 Category: config
 */

function jbossCli(hljs) {
  const PARAM = {
    begin: /[\w-]+ *=/,
    returnBegin: true,
    relevance: 0,
    contains: [
      {
        className: 'attr',
        begin: /[\w-]+/
      }
    ]
  };
  const PARAMSBLOCK = {
    className: 'params',
    begin: /\(/,
    end: /\)/,
    contains: [ PARAM ],
    relevance: 0
  };
  const OPERATION = {
    className: 'function',
    begin: /:[\w\-.]+/,
    relevance: 0
  };
  const PATH = {
    className: 'string',
    begin: /\B([\/.])[\w\-.\/=]+/
  };
  const COMMAND_PARAMS = {
    className: 'params',
    begin: /--[\w\-=\/]+/
  };
  return {
    name: 'JBoss CLI',
    aliases: [ 'wildfly-cli' ],
    keywords: {
      $pattern: '[a-z\-]+',
      keyword: 'alias batch cd clear command connect connection-factory connection-info data-source deploy '
      + 'deployment-info deployment-overlay echo echo-dmr help history if jdbc-driver-info jms-queue|20 jms-topic|20 ls '
      + 'patch pwd quit read-attribute read-operation reload rollout-plan run-batch set shutdown try unalias '
      + 'undeploy unset version xa-data-source', // module
      literal: 'true false'
    },
    contains: [
      hljs.HASH_COMMENT_MODE,
      hljs.QUOTE_STRING_MODE,
      COMMAND_PARAMS,
      OPERATION,
      PATH,
      PARAMSBLOCK
    ]
  };
}

export { jbossCli as default };
