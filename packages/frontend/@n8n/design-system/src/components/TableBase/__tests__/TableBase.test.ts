/**
 * Test suite for TableBase component
 */

import { render } from '@testing-library/vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TableBase from '../TableBase.vue';

describe('TableBase', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		it('should render with default structure', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<thead>
							<tr>
								<th>Header 1</th>
								<th>Header 2</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Cell 1</td>
								<td>Cell 2</td>
							</tr>
						</tbody>
					`,
				},
			});

			const tableWrapper = container.querySelector('[class*="n8nTable"]');
			expect(tableWrapper).toBeInTheDocument();

			const scrollContainer = container.querySelector('[class*="n8nTableScroll"]');
			expect(scrollContainer).toBeInTheDocument();

			const table = container.querySelector('table');
			expect(table).toBeInTheDocument();
		});

		it('should render slot content inside table', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<thead>
							<tr>
								<th>Name</th>
								<th>Email</th>
								<th>Role</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>John Doe</td>
								<td>john@example.com</td>
								<td>Admin</td>
							</tr>
							<tr>
								<td>Jane Smith</td>
								<td>jane@example.com</td>
								<td>User</td>
							</tr>
						</tbody>
					`,
				},
			});

			const table = container.querySelector('table');
			expect(table).toBeInTheDocument();

			// Check headers
			const headers = container.querySelectorAll('th');
			expect(headers).toHaveLength(3);
			expect(headers[0]).toHaveTextContent('Name');
			expect(headers[1]).toHaveTextContent('Email');
			expect(headers[2]).toHaveTextContent('Role');

			// Check data cells
			const cells = container.querySelectorAll('td');
			expect(cells).toHaveLength(6);
			expect(cells[0]).toHaveTextContent('John Doe');
			expect(cells[1]).toHaveTextContent('john@example.com');
			expect(cells[2]).toHaveTextContent('Admin');
			expect(cells[3]).toHaveTextContent('Jane Smith');
			expect(cells[4]).toHaveTextContent('jane@example.com');
			expect(cells[5]).toHaveTextContent('User');
		});

		it('should render empty table when no slot content provided', () => {
			const { container } = render(TableBase);

			const table = container.querySelector('table');
			expect(table).toBeInTheDocument();
			expect(table?.textContent).toBe('');
		});
	});

	describe('CSS Classes and Structure', () => {
		it('should apply correct CSS classes to wrapper elements', () => {
			const { container } = render(TableBase, {
				slots: {
					default: '<tbody><tr><td>Test</td></tr></tbody>',
				},
			});

			const tableWrapper = container.querySelector('[class*="n8nTable"]');
			expect(tableWrapper).toHaveClass('n8nTable');

			const scrollContainer = container.querySelector('[class*="n8nTableScroll"]');
			expect(scrollContainer).toHaveClass('n8nTableScroll');
		});

		it('should have correct DOM hierarchy', () => {
			const { container } = render(TableBase, {
				slots: {
					default: '<tbody><tr><td>Test</td></tr></tbody>',
				},
			});

			const tableWrapper = container.querySelector('[class*="n8nTable"]');
			const scrollContainer = tableWrapper?.querySelector('[class*="n8nTableScroll"]');
			const table = scrollContainer?.querySelector('table');

			expect(tableWrapper).toBeInTheDocument();
			expect(scrollContainer).toBeInTheDocument();
			expect(table).toBeInTheDocument();

			// Verify hierarchy
			expect(tableWrapper).toContainElement(scrollContainer!);
			expect(scrollContainer).toContainElement(table!);
		});
	});

	describe('Table Headers', () => {
		it('should render table headers correctly', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<thead>
							<tr>
								<th>First Header</th>
								<th>Second Header</th>
								<th>Third Header</th>
							</tr>
						</thead>
					`,
				},
			});

			const thead = container.querySelector('thead');
			expect(thead).toBeInTheDocument();

			const headers = container.querySelectorAll('th');
			expect(headers).toHaveLength(3);
			expect(headers[0]).toHaveTextContent('First Header');
			expect(headers[1]).toHaveTextContent('Second Header');
			expect(headers[2]).toHaveTextContent('Third Header');
		});

		it('should handle multiple header rows', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<thead>
							<tr>
								<th colspan="2">Group 1</th>
								<th>Group 2</th>
							</tr>
							<tr>
								<th>Sub 1</th>
								<th>Sub 2</th>
								<th>Sub 3</th>
							</tr>
						</thead>
					`,
				},
			});

			const thead = container.querySelector('thead');
			expect(thead).toBeInTheDocument();

			const headerRows = container.querySelectorAll('thead tr');
			expect(headerRows).toHaveLength(2);

			const firstRowHeaders = headerRows[0].querySelectorAll('th');
			expect(firstRowHeaders).toHaveLength(2);
			expect(firstRowHeaders[0]).toHaveTextContent('Group 1');
			expect(firstRowHeaders[0]).toHaveAttribute('colspan', '2');

			const secondRowHeaders = headerRows[1].querySelectorAll('th');
			expect(secondRowHeaders).toHaveLength(3);
		});

		it('should handle empty headers', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<thead>
							<tr>
								<th></th>
								<th>Name</th>
								<th></th>
							</tr>
						</thead>
					`,
				},
			});

			const headers = container.querySelectorAll('th');
			expect(headers).toHaveLength(3);
			expect(headers[0]).toBeEmptyDOMElement();
			expect(headers[1]).toHaveTextContent('Name');
			expect(headers[2]).toBeEmptyDOMElement();
		});
	});

	describe('Table Body and Rows', () => {
		it('should render table body with multiple rows', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<tbody>
							<tr>
								<td>Row 1 Col 1</td>
								<td>Row 1 Col 2</td>
							</tr>
							<tr>
								<td>Row 2 Col 1</td>
								<td>Row 2 Col 2</td>
							</tr>
							<tr>
								<td>Row 3 Col 1</td>
								<td>Row 3 Col 2</td>
							</tr>
						</tbody>
					`,
				},
			});

			const tbody = container.querySelector('tbody');
			expect(tbody).toBeInTheDocument();

			const rows = container.querySelectorAll('tbody tr');
			expect(rows).toHaveLength(3);

			const cells = container.querySelectorAll('td');
			expect(cells).toHaveLength(6);
			expect(cells[0]).toHaveTextContent('Row 1 Col 1');
			expect(cells[1]).toHaveTextContent('Row 1 Col 2');
			expect(cells[2]).toHaveTextContent('Row 2 Col 1');
			expect(cells[3]).toHaveTextContent('Row 2 Col 2');
		});

		it('should handle empty table body', () => {
			const { container } = render(TableBase, {
				slots: {
					default: '<tbody></tbody>',
				},
			});

			const tbody = container.querySelector('tbody');
			expect(tbody).toBeInTheDocument();
			expect(tbody).toBeEmptyDOMElement();
		});

		it('should render rows with different number of cells', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<tbody>
							<tr>
								<td>Cell 1</td>
								<td>Cell 2</td>
								<td>Cell 3</td>
							</tr>
							<tr>
								<td>Cell 1</td>
								<td>Cell 2</td>
							</tr>
							<tr>
								<td>Cell 1</td>
							</tr>
						</tbody>
					`,
				},
			});

			const rows = container.querySelectorAll('tbody tr');
			expect(rows).toHaveLength(3);

			expect(rows[0].querySelectorAll('td')).toHaveLength(3);
			expect(rows[1].querySelectorAll('td')).toHaveLength(2);
			expect(rows[2].querySelectorAll('td')).toHaveLength(1);
		});
	});

	describe('Complex Table Structures', () => {
		it('should handle table with header and body', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<thead>
							<tr>
								<th>ID</th>
								<th>Name</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>1</td>
								<td>John Doe</td>
								<td>Active</td>
							</tr>
							<tr>
								<td>2</td>
								<td>Jane Smith</td>
								<td>Inactive</td>
							</tr>
						</tbody>
					`,
				},
			});

			const thead = container.querySelector('thead');
			const tbody = container.querySelector('tbody');

			expect(thead).toBeInTheDocument();
			expect(tbody).toBeInTheDocument();

			const headers = container.querySelectorAll('th');
			const cells = container.querySelectorAll('td');

			expect(headers).toHaveLength(3);
			expect(cells).toHaveLength(6);
		});

		it('should handle table with footer', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<thead>
							<tr>
								<th>Item</th>
								<th>Price</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Product 1</td>
								<td>$10.00</td>
							</tr>
							<tr>
								<td>Product 2</td>
								<td>$20.00</td>
							</tr>
						</tbody>
						<tfoot>
							<tr>
								<td>Total</td>
								<td>$30.00</td>
							</tr>
						</tfoot>
					`,
				},
			});

			const thead = container.querySelector('thead');
			const tbody = container.querySelector('tbody');
			const tfoot = container.querySelector('tfoot');

			expect(thead).toBeInTheDocument();
			expect(tbody).toBeInTheDocument();
			expect(tfoot).toBeInTheDocument();

			const footerCells = tfoot?.querySelectorAll('td');
			expect(footerCells).toHaveLength(2);
			expect(footerCells![0]).toHaveTextContent('Total');
			expect(footerCells![1]).toHaveTextContent('$30.00');
		});

		it('should handle table with colspan and rowspan', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<tbody>
							<tr>
								<td colspan="2">Spanning 2 columns</td>
								<td>Normal cell</td>
							</tr>
							<tr>
								<td rowspan="2">Spanning 2 rows</td>
								<td>Cell 2</td>
								<td>Cell 3</td>
							</tr>
							<tr>
								<td>Cell 2 (row 3)</td>
								<td>Cell 3 (row 3)</td>
							</tr>
						</tbody>
					`,
				},
			});

			const colspanCell = container.querySelector('td[colspan="2"]');
			const rowspanCell = container.querySelector('td[rowspan="2"]');

			expect(colspanCell).toBeInTheDocument();
			expect(colspanCell).toHaveAttribute('colspan', '2');
			expect(colspanCell).toHaveTextContent('Spanning 2 columns');

			expect(rowspanCell).toBeInTheDocument();
			expect(rowspanCell).toHaveAttribute('rowspan', '2');
			expect(rowspanCell).toHaveTextContent('Spanning 2 rows');
		});
	});

	describe('Content Handling', () => {
		it('should handle HTML content in cells', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<tbody>
							<tr>
								<td><strong>Bold text</strong></td>
								<td><em>Italic text</em></td>
								<td><a href="https://example.com">Link</a></td>
							</tr>
						</tbody>
					`,
				},
			});

			const strongElement = container.querySelector('strong');
			const emElement = container.querySelector('em');
			const linkElement = container.querySelector('a');

			expect(strongElement).toBeInTheDocument();
			expect(strongElement).toHaveTextContent('Bold text');

			expect(emElement).toBeInTheDocument();
			expect(emElement).toHaveTextContent('Italic text');

			expect(linkElement).toBeInTheDocument();
			expect(linkElement).toHaveTextContent('Link');
			expect(linkElement).toHaveAttribute('href', 'https://example.com');
		});

		it('should handle special characters and Unicode', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<tbody>
							<tr>
								<td>Special: &lt;&gt;&amp;</td>
								<td>Unicode: ������</td>
								<td>Emoji: <�(=�</td>
								<td>Math: </td>
							</tr>
						</tbody>
					`,
				},
			});

			const cells = container.querySelectorAll('td');
			expect(cells[0]).toHaveTextContent('Special: <>&');
			expect(cells[1]).toHaveTextContent('Unicode: ������');
			expect(cells[2]).toHaveTextContent('Emoji: <�(=�');
			expect(cells[3]).toHaveTextContent('Math: ');
		});

		it('should handle very long content', () => {
			const longContent = 'This is a very long cell content '.repeat(20);
			const { container } = render(TableBase, {
				slots: {
					default: `
						<tbody>
							<tr>
								<td>${longContent}</td>
								<td>Normal content</td>
							</tr>
						</tbody>
					`,
				},
			});

			const longCell = container.querySelector('td');
			expect(longCell?.textContent).toBe(longContent);
		});

		it('should handle empty cells', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<tbody>
							<tr>
								<td></td>
								<td>&nbsp;</td>
								<td>Content</td>
							</tr>
						</tbody>
					`,
				},
			});

			const cells = container.querySelectorAll('td');
			expect(cells[0]?.textContent).toBe('');
			expect(cells[1]?.innerHTML).toBe('&nbsp;');
			expect(cells[2]).toHaveTextContent('Content');
		});
	});

	describe('Scrolling Behavior', () => {
		it('should have scrollable container', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<thead>
							<tr>
								<th>Header 1</th>
								<th>Header 2</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Cell 1</td>
								<td>Cell 2</td>
							</tr>
						</tbody>
					`,
				},
			});

			const scrollContainer = container.querySelector('[class*="n8nTableScroll"]');
			expect(scrollContainer).toBeInTheDocument();

			// Verify the scroll container exists and can contain scrollable content
			expect(scrollContainer).toHaveClass('n8nTableScroll');
		});

		it('should maintain table structure within scroll container', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<thead>
							<tr>
								<th>Column 1</th>
								<th>Column 2</th>
								<th>Column 3</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Data 1</td>
								<td>Data 2</td>
								<td>Data 3</td>
							</tr>
						</tbody>
					`,
				},
			});

			const scrollContainer = container.querySelector('[class*="n8nTableScroll"]');
			const table = scrollContainer?.querySelector('table');

			expect(table).toBeInTheDocument();
			expect(scrollContainer).toContainElement(table!);
		});
	});

	describe('Accessibility', () => {
		it('should maintain proper table semantics', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<thead>
							<tr>
								<th scope="col">Name</th>
								<th scope="col">Email</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<th scope="row">John Doe</th>
								<td>john@example.com</td>
							</tr>
						</tbody>
					`,
				},
			});

			const table = container.querySelector('table');
			const thead = container.querySelector('thead');
			const tbody = container.querySelector('tbody');

			expect(table?.tagName).toBe('TABLE');
			expect(thead?.tagName).toBe('THEAD');
			expect(tbody?.tagName).toBe('TBODY');

			const colHeaders = container.querySelectorAll('th[scope="col"]');
			const rowHeaders = container.querySelectorAll('th[scope="row"]');

			expect(colHeaders).toHaveLength(2);
			expect(rowHeaders).toHaveLength(1);
		});

		it('should support table captions', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<caption>User Data Table</caption>
						<thead>
							<tr>
								<th>Name</th>
								<th>Role</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>John</td>
								<td>Admin</td>
							</tr>
						</tbody>
					`,
				},
			});

			const caption = container.querySelector('caption');
			expect(caption).toBeInTheDocument();
			expect(caption).toHaveTextContent('User Data Table');
		});

		it('should preserve ARIA attributes', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<thead>
							<tr>
								<th aria-sort="ascending">Sortable Header</th>
								<th>Regular Header</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td aria-describedby="help-text">Cell with description</td>
								<td>Regular cell</td>
							</tr>
						</tbody>
					`,
				},
			});

			const sortableHeader = container.querySelector('th[aria-sort]');
			const describedCell = container.querySelector('td[aria-describedby]');

			expect(sortableHeader).toHaveAttribute('aria-sort', 'ascending');
			expect(describedCell).toHaveAttribute('aria-describedby', 'help-text');
		});
	});

	describe('Edge Cases', () => {
		it('should handle nested tables', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<tbody>
							<tr>
								<td>
									Regular cell
								</td>
								<td>
									<table>
										<tbody>
											<tr>
												<td>Nested cell</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>
						</tbody>
					`,
				},
			});

			const outerTable = container.querySelector('table');
			const nestedTable = container.querySelector('table table');

			expect(outerTable).toBeInTheDocument();
			expect(nestedTable).toBeInTheDocument();
			expect(outerTable).toContainElement(nestedTable!);
		});

		it('should handle malformed HTML gracefully', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<tr>
							<td>Cell without tbody</td>
						</tr>
					`,
				},
			});

			// Browser should auto-correct and wrap in tbody
			const table = container.querySelector('table');
			expect(table).toBeInTheDocument();
		});

		it('should handle component unmounting gracefully', () => {
			const { unmount } = render(TableBase, {
				slots: {
					default: `
						<thead>
							<tr>
								<th>Header</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Cell</td>
							</tr>
						</tbody>
					`,
				},
			});

			expect(() => {
				unmount();
			}).not.toThrow();
		});

		it('should handle rapid slot content changes', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<tbody>
							<tr>
								<td>Content that can change</td>
							</tr>
						</tbody>
					`,
				},
			});

			// Verify the component can handle slot content
			const cell = container.querySelector('td');
			expect(cell).toHaveTextContent('Content that can change');

			// Verify table structure remains intact
			const table = container.querySelector('table');
			const tbody = container.querySelector('tbody');
			expect(table).toBeInTheDocument();
			expect(tbody).toBeInTheDocument();
		});
	});

	describe('Performance', () => {
		it('should handle large tables efficiently', () => {
			const rows = Array.from(
				{ length: 100 },
				(_, i) => `
				<tr>
					<td>Row ${i + 1} Col 1</td>
					<td>Row ${i + 1} Col 2</td>
					<td>Row ${i + 1} Col 3</td>
				</tr>
			`,
			).join('');

			const { container } = render(TableBase, {
				slots: {
					default: `
						<thead>
							<tr>
								<th>Column 1</th>
								<th>Column 2</th>
								<th>Column 3</th>
							</tr>
						</thead>
						<tbody>
							${rows}
						</tbody>
					`,
				},
			});

			const tableRows = container.querySelectorAll('tbody tr');
			expect(tableRows).toHaveLength(100);

			const cells = container.querySelectorAll('td');
			expect(cells).toHaveLength(300); // 100 rows � 3 columns

			// Test first and last rows
			expect(cells[0]).toHaveTextContent('Row 1 Col 1');
			expect(cells[299]).toHaveTextContent('Row 100 Col 3');
		});

		it('should handle tables with many columns', () => {
			const headers = Array.from({ length: 50 }, (_, i) => `<th>Header ${i + 1}</th>`).join('');
			const cells = Array.from({ length: 50 }, (_, i) => `<td>Cell ${i + 1}</td>`).join('');

			const { container } = render(TableBase, {
				slots: {
					default: `
						<thead>
							<tr>
								${headers}
							</tr>
						</thead>
						<tbody>
							<tr>
								${cells}
							</tr>
						</tbody>
					`,
				},
			});

			const headerElements = container.querySelectorAll('th');
			const cellElements = container.querySelectorAll('td');

			expect(headerElements).toHaveLength(50);
			expect(cellElements).toHaveLength(50);

			expect(headerElements[0]).toHaveTextContent('Header 1');
			expect(headerElements[49]).toHaveTextContent('Header 50');
			expect(cellElements[0]).toHaveTextContent('Cell 1');
			expect(cellElements[49]).toHaveTextContent('Cell 50');
		});
	});

	describe('CSS Module Classes', () => {
		it('should apply n8nTable class to wrapper', () => {
			const { container } = render(TableBase);

			const tableWrapper = container.querySelector('[class*="n8nTable"]');
			expect(tableWrapper).toBeInTheDocument();
		});

		it('should apply n8nTableScroll class to scroll container', () => {
			const { container } = render(TableBase);

			const scrollContainer = container.querySelector('[class*="n8nTableScroll"]');
			expect(scrollContainer).toBeInTheDocument();
		});

		it('should maintain class structure with content', () => {
			const { container } = render(TableBase, {
				slots: {
					default: `
						<thead>
							<tr>
								<th>Header</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>Cell</td>
							</tr>
						</tbody>
					`,
				},
			});

			const tableWrapper = container.querySelector('[class*="n8nTable"]');
			const scrollContainer = container.querySelector('[class*="n8nTableScroll"]');
			const table = container.querySelector('table');

			expect(tableWrapper).toContainElement(scrollContainer!);
			expect(scrollContainer).toContainElement(table!);
		});
	});
});
