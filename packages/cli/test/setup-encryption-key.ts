import 'reflect-metadata';
import { Container } from '@n8n/di';
import { Cipher, EncryptionKeyProxy, InstanceSettings } from 'n8n-core';

// The cipher has no fallback path: every encrypt/decrypt needs a key provider.
// Production wires one in `BaseCommand.init()`; the test harness has no equivalent,
// so register the default no-rotation provider here for every suite.
//
// The descriptor is the legacy instance-key row (no-prefix, instance-key-wrapped),
// matching `KeyManagerService.instanceKeyLegacyInfo()`. It resolves the cipher and
// instance key lazily, so it always tracks the configured key (real or mocked) and
// does nothing for suites that never encrypt. A suite that needs a different
// provider (rotation, key-not-found) overwrites this by calling `setProvider`.
const legacyDescriptor = async () => {
	const cipher = Container.get(Cipher);
	const { encryptionKey } = Container.get(InstanceSettings);
	return {
		id: 'instance-key',
		value: cipher.encryptDEKWithInstanceKey(encryptionKey),
		algorithm: 'aes-256-cbc' as const,
		format: 'no-prefix' as const,
	};
};

Container.get(EncryptionKeyProxy).setProvider({
	getActiveKey: legacyDescriptor,
	getLegacyKey: legacyDescriptor,
	getKeyById: async () => null,
});
