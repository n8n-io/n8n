/* eslint-disable @typescript-eslint/dot-notation */
import { mock } from 'jest-mock-extended';
import type { MemoryVectorStore } from 'langchain/vectorstores/memory';

import { StoreCleanupService } from '../StoreCleanupService';
import type { VectorStoreMetadata } from '../types';

describe('StoreCleanupService', () => {
	// Setup test data
	let vectorStores: Map<string, MemoryVectorStore>;
	let storeMetadata: Map<string, VectorStoreMetadata>;
	let onCleanupMock: jest.Mock;

	// Utility to add a test store with given age
	const addTestStore = (
		key: string,
		sizeBytes: number,
		createdHoursAgo: number,
		accessedHoursAgo: number,
	) => {
		const mockStore = mock<MemoryVectorStore>();
		vectorStores.set(key, mockStore);

		const now = Date.now();
		storeMetadata.set(key, {
			size: sizeBytes,
			createdAt: new Date(now - createdHoursAgo * 3600000),
			lastAccessed: new Date(now - accessedHoursAgo * 3600000),
		});
	};

	beforeEach(() => {
		vectorStores = new Map();
		storeMetadata = new Map();
		onCleanupMock = jest.fn();
	});

	describe('TTL-based cleanup', () => {
		it('should identify inactive stores correctly', () => {
			const service = new StoreCleanupService(
				100 * 1024 * 1024, // 100MB max
				24 * 3600 * 1000, // 24 hours TTL
				vectorStores,
				storeMetadata,
				onCleanupMock,
			);

			// Create test metadata
			const recentMetadata: VectorStoreMetadata = {
				size: 1024,
				createdAt: new Date(Date.now() - 48 * 3600 * 1000), // 48 hours ago
				lastAccessed: new Date(Date.now() - 12 * 3600 * 1000), // 12 hours ago
			};

			const inactiveMetadata: VectorStoreMetadata = {
				size: 1024,
				createdAt: new Date(Date.now() - 48 * 3600 * 1000), // 48 hours ago
				lastAccessed: new Date(Date.now() - 36 * 3600 * 1000), // 36 hours ago
			};

			// Test the inactive check
			expect(service.isStoreInactive(recentMetadata)).toBe(false);
			expect(service.isStoreInactive(inactiveMetadata)).toBe(true);
		});

		it('should never identify stores as inactive when TTL is disabled', () => {
			const service = new StoreCleanupService(
				100 * 1024 * 1024, // 100MB max
				-1, // TTL disabled
				vectorStores,
				storeMetadata,
				onCleanupMock,
			);

			// Create very old metadata
			const veryOldMetadata: VectorStoreMetadata = {
				size: 1024,
				createdAt: new Date(Date.now() - 365 * 24 * 3600 * 1000), // 1 year ago
				lastAccessed: new Date(Date.now() - 365 * 24 * 3600 * 1000), // 1 year ago
			};

			// Should never be inactive when TTL is disabled
			expect(service.isStoreInactive(veryOldMetadata)).toBe(false);
		});

		it('should clean up inactive stores', () => {
			const service = new StoreCleanupService(
				100 * 1024 * 1024, // 100MB max
				24 * 3600 * 1000, // 24 hours TTL
				vectorStores,
				storeMetadata,
				onCleanupMock,
			);

			// Add active and inactive stores
			addTestStore('active1', 1024 * 1024, 48, 12); // 48 hours old, accessed 12 hours ago
			addTestStore('active2', 2048 * 1024, 72, 20); // 72 hours old, accessed 20 hours ago
			addTestStore('inactive1', 3072 * 1024, 100, 30); // 100 hours old, accessed 30 hours ago
			addTestStore('inactive2', 4096 * 1024, 120, 48); // 120 hours old, accessed 48 hours ago

			// Run cleanup
			service.cleanupInactiveStores();

			// Check which stores were cleaned up
			expect(vectorStores.has('active1')).toBe(true);
			expect(vectorStores.has('active2')).toBe(true);
			expect(vectorStores.has('inactive1')).toBe(false);
			expect(vectorStores.has('inactive2')).toBe(false);

			// Metadata should also be cleaned up
			expect(storeMetadata.has('active1')).toBe(true);
			expect(storeMetadata.has('active2')).toBe(true);
			expect(storeMetadata.has('inactive1')).toBe(false);
			expect(storeMetadata.has('inactive2')).toBe(false);

			// Check callback was called correctly
			expect(onCleanupMock).toHaveBeenCalledWith(
				expect.arrayContaining(['inactive1', 'inactive2']),
				7168 * 1024, // sum of inactive store sizes
				'ttl',
			);
		});

		it('should not run TTL cleanup when disabled', () => {
			const service = new StoreCleanupService(
				100 * 1024 * 1024, // 100MB max
				-1, // TTL disabled
				vectorStores,
				storeMetadata,
				onCleanupMock,
			);

			// Add all "inactive" stores
			addTestStore('store1', 1024 * 1024, 48, 30);
			addTestStore('store2', 2048 * 1024, 72, 48);

			// Run cleanup
			service.cleanupInactiveStores();

			// Nothing should be cleaned up
			expect(vectorStores.size).toBe(2);
			expect(storeMetadata.size).toBe(2);
			expect(onCleanupMock).not.toHaveBeenCalled();
		});
	});

	describe('Memory-based cleanup', () => {
		it('should clean up oldest stores to make room for new data', () => {
			const maxMemoryBytes = 10 * 1024 * 1024; // 10MB
			const service = new StoreCleanupService(
				maxMemoryBytes,
				24 * 3600 * 1000, // 24 hours TTL
				vectorStores,
				storeMetadata,
				onCleanupMock,
			);

			// Add stores with different creation times
			addTestStore('newest', 2 * 1024 * 1024, 1, 1); // 2MB, 1 hour old
			addTestStore('newer', 3 * 1024 * 1024, 2, 1); // 3MB, 2 hours old
			addTestStore('older', 3 * 1024 * 1024, 3, 1); // 3MB, 3 hours old
			addTestStore('oldest', 2 * 1024 * 1024, 4, 1); // 2MB, 4 hours old

			// Current total: 10MB

			// Try to add 5MB more
			service.cleanupOldestStores(5 * 1024 * 1024);

			// Should have removed oldest and older (5MB total)
			expect(vectorStores.has('newest')).toBe(true);
			expect(vectorStores.has('newer')).toBe(true);
			expect(vectorStores.has('older')).toBe(false);
			expect(vectorStores.has('oldest')).toBe(false);

			// Check callback
			expect(onCleanupMock).toHaveBeenCalledWith(
				expect.arrayContaining(['older', 'oldest']),
				5 * 1024 * 1024,
				'memory',
			);
		});

		it('should run TTL cleanup before memory cleanup', () => {
			const maxMemoryBytes = 10 * 1024 * 1024; // 10MB
			const service = new StoreCleanupService(
				maxMemoryBytes,
				24 * 3600 * 1000, // 24 hours TTL
				vectorStores,
				storeMetadata,
				onCleanupMock,
			);

			// Add a mix of active and inactive stores
			addTestStore('active-newest', 2 * 1024 * 1024, 1, 1); // 2MB, active
			addTestStore('active-older', 3 * 1024 * 1024, 3, 12); // 3MB, active
			addTestStore('inactive', 3 * 1024 * 1024, 3, 30); // 3MB, inactive (30h)
			addTestStore('active-oldest', 2 * 1024 * 1024, 4, 20); // 2MB, active

			// Total: 10MB, with 3MB inactive

			// Try to add 5MB more
			service.cleanupOldestStores(5 * 1024 * 1024);

			// Should have removed inactive first, then active-oldest (5MB total)
			expect(vectorStores.has('active-newest')).toBe(true);
			expect(vectorStores.has('active-older')).toBe(true);
			expect(vectorStores.has('inactive')).toBe(false);
			expect(vectorStores.has('active-oldest')).toBe(false);

			// Check callbacks
			expect(onCleanupMock).toHaveBeenCalledTimes(2);
			// First call for TTL cleanup
			expect(onCleanupMock).toHaveBeenNthCalledWith(1, ['inactive'], 3 * 1024 * 1024, 'ttl');
			// Second call for memory cleanup
			expect(onCleanupMock).toHaveBeenNthCalledWith(
				2,
				['active-oldest'],
				2 * 1024 * 1024,
				'memory',
			);
		});

		it('should not perform memory cleanup when limit is disabled', () => {
			const service = new StoreCleanupService(
				-1, // Memory limit disabled
				24 * 3600 * 1000, // 24 hours TTL
				vectorStores,
				storeMetadata,
				onCleanupMock,
			);

			// Add some stores
			addTestStore('store1', 5 * 1024 * 1024, 1, 1);
			addTestStore('store2', 10 * 1024 * 1024, 2, 1);

			// Try to add a lot more data
			service.cleanupOldestStores(100 * 1024 * 1024);

			// Nothing should be cleaned up
			expect(vectorStores.size).toBe(2);
			expect(storeMetadata.size).toBe(2);
			expect(onCleanupMock).not.toHaveBeenCalled();
		});

		it('should handle empty stores during cleanup', () => {
			const service = new StoreCleanupService(
				10 * 1024 * 1024, // 10MB
				24 * 3600 * 1000, // 24 hours TTL
				vectorStores,
				storeMetadata,
				onCleanupMock,
			);

			service.cleanupOldestStores(5 * 1024 * 1024);
			service.cleanupInactiveStores();

			expect(onCleanupMock).not.toHaveBeenCalled();
		});

		it('should update the cache when stores are removed', () => {
			const service = new StoreCleanupService(
				10 * 1024 * 1024, // 10MB
				24 * 3600 * 1000, // 24 hours TTL
				vectorStores,
				storeMetadata,
				onCleanupMock,
			);

			// Add test stores
			addTestStore('newest', 2 * 1024 * 1024, 1, 1);
			addTestStore('middle', 3 * 1024 * 1024, 3, 1);
			addTestStore('oldest', 4 * 1024 * 1024, 5, 1);

			// Trigger a cleanup that will remove only the oldest store
			service.cleanupOldestStores(4 * 1024 * 1024); // 4MB

			// Verify removal
			expect(vectorStores.has('oldest')).toBe(false);
			expect(vectorStores.has('middle')).toBe(true);
			expect(vectorStores.has('newest')).toBe(true);

			// Check that the cache was updated correctly
			const cacheKeys = service['oldestStoreKeys'];
			expect(cacheKeys.includes('oldest')).toBe(false);
			expect(cacheKeys.includes('middle')).toBe(true);
			expect(cacheKeys.includes('newest')).toBe(true);
		});
	});
});
