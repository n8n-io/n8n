/*
Language: Packet Filter config
Description: pf.conf — packet filter configuration file (OpenBSD)
Author: Peter Piwowarski <oldlaptop654@aol.com>
Website: http://man.openbsd.org/pf.conf
Category: config
*/

function pf(hljs) {
  const MACRO = {
    className: 'variable',
    begin: /\$[\w\d#@][\w\d_]*/,
    relevance: 0
  };
  const TABLE = {
    className: 'variable',
    begin: /<(?!\/)/,
    end: />/
  };

  return {
    name: 'Packet Filter config',
    aliases: [ 'pf.conf' ],
    keywords: {
      $pattern: /[a-z0-9_<>-]+/,
      built_in: /* block match pass are "actions" in pf.conf(5), the rest are
                 * lexically similar top-level commands.
                 */
        'block match pass load anchor|5 antispoof|10 set table',
      keyword:
        'in out log quick on rdomain inet inet6 proto from port os to route '
        + 'allow-opts divert-packet divert-reply divert-to flags group icmp-type '
        + 'icmp6-type label once probability recieved-on rtable prio queue '
        + 'tos tag tagged user keep fragment for os drop '
        + 'af-to|10 binat-to|10 nat-to|10 rdr-to|10 bitmask least-stats random round-robin '
        + 'source-hash static-port '
        + 'dup-to reply-to route-to '
        + 'parent bandwidth default min max qlimit '
        + 'block-policy debug fingerprints hostid limit loginterface optimization '
        + 'reassemble ruleset-optimization basic none profile skip state-defaults '
        + 'state-policy timeout '
        + 'const counters persist '
        + 'no modulate synproxy state|5 floating if-bound no-sync pflow|10 sloppy '
        + 'source-track global rule max-src-nodes max-src-states max-src-conn '
        + 'max-src-conn-rate overload flush '
        + 'scrub|5 max-mss min-ttl no-df|10 random-id',
      literal:
        'all any no-route self urpf-failed egress|5 unknown'
    },
    contains: [
      hljs.HASH_COMMENT_MODE,
      hljs.NUMBER_MODE,
      hljs.QUOTE_STRING_MODE,
      MACRO,
      TABLE
    ]
  };
}

export { pf as default };
