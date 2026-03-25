/*
Language: crmsh
Author: Kristoffer Gronlund <kgronlund@suse.com>
Website: http://crmsh.github.io
Description: Syntax Highlighting for the crmsh DSL
Category: config
*/

/** @type LanguageFn */
function crmsh(hljs) {
  const RESOURCES = 'primitive rsc_template';
  const COMMANDS = 'group clone ms master location colocation order fencing_topology '
      + 'rsc_ticket acl_target acl_group user role '
      + 'tag xml';
  const PROPERTY_SETS = 'property rsc_defaults op_defaults';
  const KEYWORDS = 'params meta operations op rule attributes utilization';
  const OPERATORS = 'read write deny defined not_defined in_range date spec in '
      + 'ref reference attribute type xpath version and or lt gt tag '
      + 'lte gte eq ne \\';
  const TYPES = 'number string';
  const LITERALS = 'Master Started Slave Stopped start promote demote stop monitor true false';

  return {
    name: 'crmsh',
    aliases: [
      'crm',
      'pcmk'
    ],
    case_insensitive: true,
    keywords: {
      keyword: KEYWORDS + ' ' + OPERATORS + ' ' + TYPES,
      literal: LITERALS
    },
    contains: [
      hljs.HASH_COMMENT_MODE,
      {
        beginKeywords: 'node',
        starts: {
          end: '\\s*([\\w_-]+:)?',
          starts: {
            className: 'title',
            end: '\\s*[\\$\\w_][\\w_-]*'
          }
        }
      },
      {
        beginKeywords: RESOURCES,
        starts: {
          className: 'title',
          end: '\\s*[\\$\\w_][\\w_-]*',
          starts: { end: '\\s*@?[\\w_][\\w_\\.:-]*' }
        }
      },
      {
        begin: '\\b(' + COMMANDS.split(' ').join('|') + ')\\s+',
        keywords: COMMANDS,
        starts: {
          className: 'title',
          end: '[\\$\\w_][\\w_-]*'
        }
      },
      {
        beginKeywords: PROPERTY_SETS,
        starts: {
          className: 'title',
          end: '\\s*([\\w_-]+:)?'
        }
      },
      hljs.QUOTE_STRING_MODE,
      {
        className: 'meta',
        begin: '(ocf|systemd|service|lsb):[\\w_:-]+',
        relevance: 0
      },
      {
        className: 'number',
        begin: '\\b\\d+(\\.\\d+)?(ms|s|h|m)?',
        relevance: 0
      },
      {
        className: 'literal',
        begin: '[-]?(infinity|inf)',
        relevance: 0
      },
      {
        className: 'attr',
        begin: /([A-Za-z$_#][\w_-]+)=/,
        relevance: 0
      },
      {
        className: 'tag',
        begin: '</?',
        end: '/?>',
        relevance: 0
      }
    ]
  };
}

module.exports = crmsh;
