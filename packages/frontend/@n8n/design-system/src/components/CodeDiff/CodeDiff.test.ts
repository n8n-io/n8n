import { render } from '@testing-library/vue';

import CodeDiff from './CodeDiff.vue';

const stubs = ['n8n-button', 'n8n-icon'];

describe('CodeDiff', () => {
	it('renders code diff correctly', () => {
		const { container } = render(CodeDiff, {
			props: {
				title: 'Lao Tzu example unified diff',
				content:
					"--- original.js\n+++ modified.js\n@@ -1,2 +1,2 @@\n-const SIGNING_SECRET = $input.first().json.slack_secret_signature;\n-const item = $('Webhook to call for Slack command').first();\n+const SIGNING_SECRET = items[0].json.slack_secret_signature;\n+const item = items[0];\n@@ -7,8 +7,6 @@\n}\n\n-const crypto = require('crypto');\n-\n const { binary: { data } } = item;\n\n if (\n@@ -22,7 +20,7 @@\n const rawBody = Buffer.from(data.data, 'base64').toString()\n \n // compute the ",
			},
			global: { stubs },
		});
		expect(container).toMatchSnapshot();
	});

	it('renders replaced code diff correctly', () => {
		const { container } = render(CodeDiff, {
			props: {
				title: 'Lao Tzu example unified diff',
				content:
					'@@ -1,7 +1,6 @@\n-The Way that can be told of is not the eternal Way;\n-The name that can be named is not the eternal name.\nThe Nameless is the origin of Heaven and Earth;\n-The Named is the mother of all things.\n+The named is the mother of all things.\n+\nTherefore let there always be non-being,\nso we may see their subtlety,\nAnd let there always be being,\n@@ -9,3 +8,6 @@\n The two are the same,\n But after they are produced,\n they have different names.\n+They both may be called deep and profound.\n+Deeper and more profound,\n+The door of all subtleties!',
				replaced: true,
			},
			global: { stubs },
		});
		expect(container).toMatchSnapshot();
	});

	it('renders replacing code diff correctly', () => {
		const { container } = render(CodeDiff, {
			props: {
				title: 'Lao Tzu example unified diff',
				content:
					'@@ -1,7 +1,6 @@\n-The Way that can be told of is not the eternal Way;\n-The name that can be named is not the eternal name.\nThe Nameless is the origin of Heaven and Earth;\n-The Named is the mother of all things.\n+The named is the mother of all things.\n+\nTherefore let there always be non-being,\nso we may see their subtlety,\nAnd let there always be being,\n@@ -9,3 +8,6 @@\n The two are the same,\n But after they are produced,\n they have different names.\n+They both may be called deep and profound.\n+Deeper and more profound,\n+The door of all subtleties!',
				replacing: true,
			},
			global: { stubs },
		});
		expect(container).toMatchSnapshot();
	});

	it('renders error state correctly', () => {
		const { container } = render(CodeDiff, {
			props: {
				title: 'Lao Tzu example unified diff',
				content:
					'@@ -1,7 +1,6 @@\n-The Way that can be told of is not the eternal Way;\n-The name that can be named is not the eternal name.\nThe Nameless is the origin of Heaven and Earth;\n-The Named is the mother of all things.\n+The named is the mother of all things.\n+\nTherefore let there always be non-being,\nso we may see their subtlety,\nAnd let there always be being,\n@@ -9,3 +8,6 @@\n The two are the same,\n But after they are produced,\n they have different names.\n+They both may be called deep and profound.\n+Deeper and more profound,\n+The door of all subtleties!',
				error: true,
			},
			global: { stubs },
		});
		expect(container).toMatchSnapshot();
	});
});
