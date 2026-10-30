import { useLoadMoreBatches } from './useLoadMoreBatches';

describe('useLoadMoreBatches', () => {
	it('should fetch the batch that starts after the loaded rows', async () => {
		const batches = useLoadMoreBatches(50);
		const fetchBatch = vi.fn().mockResolvedValue(['row']);
		const append = vi.fn();

		await batches.loadMore(48, fetchBatch, append);

		expect(fetchBatch).toHaveBeenCalledWith({ skip: 48, take: 50 });
		expect(append).toHaveBeenCalledWith(['row']);
	});

	it('should refresh every loaded batch in one request', async () => {
		const batches = useLoadMoreBatches(50);
		await batches.loadMore(50, vi.fn().mockResolvedValue([]), vi.fn());

		expect(batches.startRefresh()).toEqual({ skip: 0, take: 100 });
	});

	it('should start from the first batch after a reset', async () => {
		const batches = useLoadMoreBatches(50);
		await batches.loadMore(50, vi.fn().mockResolvedValue([]), vi.fn());

		batches.reset();

		expect(batches.startRefresh()).toEqual({ skip: 0, take: 50 });
	});

	it('should not load more while a refresh is in progress', async () => {
		const batches = useLoadMoreBatches(50);
		const fetchBatch = vi.fn();

		batches.startRefresh();
		await batches.loadMore(50, fetchBatch, vi.fn());
		expect(fetchBatch).not.toHaveBeenCalled();

		batches.endRefresh();
		await batches.loadMore(50, fetchBatch, vi.fn());
		expect(fetchBatch).toHaveBeenCalled();
	});

	it('should discard a batch when a refresh starts before the batch arrives', async () => {
		const batches = useLoadMoreBatches(50);
		let resolveBatch!: (rows: string[]) => void;
		const append = vi.fn();

		const loading = batches.loadMore(
			50,
			async () => await new Promise<string[]>((resolve) => (resolveBatch = resolve)),
			append,
		);
		batches.startRefresh();
		resolveBatch(['row']);
		await loading;

		expect(append).not.toHaveBeenCalled();
		expect(batches.isLoadingMore.value).toBe(false);
	});

	it('should load one batch at a time', async () => {
		const batches = useLoadMoreBatches(50);
		const fetchBatch = vi.fn(async () => await new Promise<string[]>(() => {}));

		void batches.loadMore(50, fetchBatch, vi.fn());
		void batches.loadMore(50, fetchBatch, vi.fn());

		expect(fetchBatch).toHaveBeenCalledTimes(1);
	});
});
