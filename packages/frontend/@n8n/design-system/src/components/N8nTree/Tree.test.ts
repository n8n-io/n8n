import { render } from '@testing-library/vue';

import N8nTree from './Tree.vue';

describe('components', () => {
	describe('N8nTree', () => {
		it('should render simple tree', () => {
			const wrapper = render(N8nTree, {
				props: {
					value: {
						hello: 'world',
					},
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render tree', () => {
			const wrapper = render(N8nTree, {
				props: {
					value: {
						hello: {
							test: 'world',
						},
						options: ['yes', 'no'],
					},
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render tree with slots', () => {
			const wrapper = render(N8nTree, {
				props: {
					value: {
						hello: {
							test: 'world',
						},
						options: ['yes', 'no'],
					},
				},
				slots: {
					label: '<span>label</span>',
					value: '<span>value</span>',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render each tree with node class', () => {
			const wrapper = render(N8nTree, {
				props: {
					value: {
						hello: {
							test: 'world',
						},
						options: ['yes', 'no'],
					},
					nodeClass: 'nodeClass',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		describe('binary data detection', () => {
			it('should render binary data with binary slot', () => {
				const binaryData = {
					mimeType: 'image/png',
					id: 'binary-id-123',
					fileName: 'test.png',
					fileExtension: 'png',
					fileType: 'image',
					fileSize: '1024',
				};

				const wrapper = render(N8nTree, {
					props: {
						value: binaryData,
					},
					slots: {
						binary: '<div class="binary-slot">Binary Data</div>',
					},
				});

				expect(wrapper.html()).toContain('binary-slot');
				expect(wrapper.html()).toContain('Binary Data');
			});

			it('should render binary data with all optional fields', () => {
				const binaryData = {
					mimeType: 'application/pdf',
					id: 'binary-id-456',
					data: 'base64data',
					fileName: 'document.pdf',
					fileExtension: 'pdf',
					fileType: 'document',
					directory: '/tmp',
					fileSize: '2048',
					bytes: 2048,
				};

				const wrapper = render(N8nTree, {
					props: {
						value: binaryData,
					},
					slots: {
						binary: '<div class="binary-data">Binary</div>',
					},
				});

				expect(wrapper.html()).toContain('binary-data');
			});

			it('should render binary data with minimal required fields', () => {
				const binaryData = {
					mimeType: 'text/plain',
					id: 'binary-id-789',
				};

				const wrapper = render(N8nTree, {
					props: {
						value: binaryData,
					},
					slots: {
						binary: '<div class="minimal-binary">Minimal</div>',
					},
				});

				expect(wrapper.html()).toContain('minimal-binary');
			});

			it('should not treat object without mimeType as binary', () => {
				const notBinary = {
					id: 'some-id',
					fileName: 'test.txt',
				};

				const wrapper = render(N8nTree, {
					props: {
						value: { file: notBinary },
					},
					slots: {
						binary: '<div class="should-not-render">Binary</div>',
					},
				});

				expect(wrapper.html()).not.toContain('should-not-render');
			});

			it('should not treat object without id as binary', () => {
				const notBinary = {
					mimeType: 'text/plain',
					fileName: 'test.txt',
				};

				const wrapper = render(N8nTree, {
					props: {
						value: { file: notBinary },
					},
					slots: {
						binary: '<div class="should-not-render">Binary</div>',
					},
				});

				expect(wrapper.html()).not.toContain('should-not-render');
			});

			it('should not treat array as binary but should detect binary objects within arrays', () => {
				const wrapper = render(N8nTree, {
					props: {
						value: {
							files: [
								{
									mimeType: 'text/plain',
									id: 'id-1',
								},
							],
						},
					},
					slots: {
						binary: '<div class="binary-in-array">Binary</div>',
					},
				});

				expect(wrapper.html()).toContain('binary-in-array');
			});

			it('should not treat object with extra keys as binary', () => {
				const notBinary = {
					mimeType: 'text/plain',
					id: 'some-id',
					extraKey: 'extra value',
				};

				const wrapper = render(N8nTree, {
					props: {
						value: { file: notBinary },
					},
					slots: {
						binary: '<div class="should-not-render-extra">Binary</div>',
					},
				});

				expect(wrapper.html()).not.toContain('should-not-render-extra');
			});

			it('should not treat object with wrong type for mimeType as binary', () => {
				const notBinary = {
					mimeType: 123,
					id: 'some-id',
				};

				const wrapper = render(N8nTree, {
					props: {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						value: { file: notBinary as any },
					},
					slots: {
						binary: '<div class="should-not-render-type">Binary</div>',
					},
				});

				expect(wrapper.html()).not.toContain('should-not-render-type');
			});

			it('should not treat object with wrong type for id as binary', () => {
				const notBinary = {
					mimeType: 'text/plain',
					id: 123,
				};

				const wrapper = render(N8nTree, {
					props: {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						value: { file: notBinary as any },
					},
					slots: {
						binary: '<div class="should-not-render-id-type">Binary</div>',
					},
				});

				expect(wrapper.html()).not.toContain('should-not-render-id-type');
			});

			it('should not treat object with wrong type for optional string field as binary', () => {
				const notBinary = {
					mimeType: 'text/plain',
					id: 'some-id',
					fileName: 123,
				};

				const wrapper = render(N8nTree, {
					props: {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						value: { file: notBinary as any },
					},
					slots: {
						binary: '<div class="should-not-render-optional">Binary</div>',
					},
				});

				expect(wrapper.html()).not.toContain('should-not-render-optional');
			});

			it('should allow bytes field to be a number', () => {
				const binaryData = {
					mimeType: 'image/jpeg',
					id: 'binary-bytes',
					bytes: 4096,
				};

				const wrapper = render(N8nTree, {
					props: {
						value: binaryData,
					},
					slots: {
						binary: '<div class="binary-with-bytes">Binary</div>',
					},
				});

				expect(wrapper.html()).toContain('binary-with-bytes');
			});

			it('should not treat object with wrong type for bytes as binary', () => {
				const notBinary = {
					mimeType: 'text/plain',
					id: 'some-id',
					bytes: 'not-a-number',
				};

				const wrapper = render(N8nTree, {
					props: {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						value: { file: notBinary as any },
					},
					slots: {
						binary: '<div class="should-not-render-bytes">Binary</div>',
					},
				});

				expect(wrapper.html()).not.toContain('should-not-render-bytes');
			});

			it('should not treat null as binary', () => {
				const wrapper = render(N8nTree, {
					props: {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						value: { file: null as any },
					},
					slots: {
						binary: '<div class="should-not-render-null">Binary</div>',
					},
				});

				expect(wrapper.html()).not.toContain('should-not-render-null');
			});

			it('should not treat undefined as binary', () => {
				const wrapper = render(N8nTree, {
					props: {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						value: { file: undefined as any },
					},
					slots: {
						binary: '<div class="should-not-render-undef">Binary</div>',
					},
				});

				expect(wrapper.html()).not.toContain('should-not-render-undef');
			});

			it('should handle nested binary data in tree structure', () => {
				const wrapper = render(N8nTree, {
					props: {
						value: {
							data: {
								attachment: {
									mimeType: 'application/pdf',
									id: 'nested-binary',
									fileName: 'report.pdf',
								},
							},
						},
					},
					slots: {
						binary: '<div class="nested-binary">Nested Binary</div>',
					},
				});

				expect(wrapper.html()).toContain('nested-binary');
			});
		});
	});
});
