import assert from 'node:assert/strict';
import { test } from 'node:test';

import { aliasHostConfig, withInclude } from '../../scripts/cloud-session-ssh-config.mjs';

const GH_CONFIG = `Host cs.ominous-doodle.master
	User node
	ProxyCommand gh cs ssh -c ominous-doodle --stdio
	UserKnownHostsFile=/dev/null
`;

test('replaces the gh host name with the fixed alias', () => {
	assert.equal(
		aliasHostConfig(GH_CONFIG),
		GH_CONFIG.replace('cs.ominous-doodle.master', 'n8n-codespace'),
	);
});

test('rejects gh output without exactly one proxied host', () => {
	assert.throws(() => aliasHostConfig(''));
	assert.throws(() => aliasHostConfig(`${GH_CONFIG}Host other\n`));
	assert.throws(() => aliasHostConfig('Host cs.x\n\tUser node\n'));
});

test('adds the Include line at the top once', () => {
	const include = 'Include ~/.ssh/n8n-codespace.conf';
	assert.equal(withInclude(''), `${include}\n`);

	const updated = withInclude('Host github.com\n\tUser git\n');
	assert.equal(updated, `${include}\n\nHost github.com\n\tUser git\n`);
	assert.equal(withInclude(updated), undefined);
});
