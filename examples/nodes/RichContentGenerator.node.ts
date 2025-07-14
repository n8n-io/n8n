import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeProperties,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

// Helper functions for generating rich content
function generateWeatherCard(item: INodeExecutionData) {
	const data = item.json;
	
	// Extract weather data from input or use defaults
	const temperature = data.temperature || data.temp || '22°C';
	const description = data.description || data.weather || 'Sunny with light clouds';
	const humidity = data.humidity || '65%';
	const wind = data.wind || data.windSpeed || '12 mph';
	const location = data.location || data.city || '';
	const icon = data.icon || '🌤️';
	
	return {
		html: `
			<div class="weather-card">
				<h2>${icon} Weather Update${location ? ` - ${location}` : ''}</h2>
				<div class="temperature">${temperature}</div>
				<div class="description">${description}</div>
				<div class="details">
					<span>Humidity: ${humidity}</span>
					<span>Wind: ${wind}</span>
				</div>
			</div>
		`,
		css: `
			.weather-card {
				background: linear-gradient(135deg, #74b9ff, #0984e3);
				color: white;
				padding: 25px;
				border-radius: 15px;
				text-align: center;
				box-shadow: 0 8px 25px rgba(0,0,0,0.15);
				max-width: 300px;
				margin: 0 auto;
			}
			.temperature {
				font-size: 3em;
				font-weight: bold;
				margin: 15px 0;
			}
			.description {
				font-size: 1.2em;
				margin-bottom: 20px;
			}
			.details {
				display: flex;
				justify-content: space-between;
				font-size: 0.9em;
				opacity: 0.9;
			}
		`,
	};
}

function generateDashboard(item: INodeExecutionData) {
	const data = item.json;
	
	// Extract dashboard data from input or use defaults
	const revenue = data.revenue || data.sales || '$125,430';
	const orders = data.orders || data.orderCount || '1,247';
	const customers = data.customers || data.customerCount || '892';
	const title = data.title || data.dashboardTitle || 'Analytics Dashboard';
	
	return {
		html: `
			<div class="dashboard">
				<h3>📊 ${title}</h3>
				<div class="metrics-grid">
					<div class="metric-card">
						<span class="metric-value">${revenue}</span>
						<div class="metric-label">Revenue</div>
					</div>
					<div class="metric-card">
						<span class="metric-value">${orders}</span>
						<div class="metric-label">Orders</div>
					</div>
					<div class="metric-card">
						<span class="metric-value">${customers}</span>
						<div class="metric-label">Customers</div>
					</div>
				</div>
				<div class="actions">
					<button class="action-btn" id="refreshBtn">🔄 Refresh</button>
					<button class="action-btn" id="exportBtn">📊 Export</button>
				</div>
			</div>
		`,
		css: `
			.dashboard {
				background: #fff;
				border: 1px solid #e1e8ed;
				border-radius: 12px;
				padding: 24px;
				box-shadow: 0 2px 10px rgba(0,0,0,0.1);
			}
			.metrics-grid {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
				gap: 16px;
				margin: 20px 0;
			}
			.metric-card {
				background: #f8f9fa;
				padding: 20px;
				border-radius: 8px;
				text-align: center;
				transition: transform 0.2s;
			}
			.metric-card:hover {
				transform: translateY(-2px);
			}
			.metric-value {
				font-size: 2em;
				font-weight: bold;
				color: #28a745;
				display: block;
			}
			.metric-label {
				color: #6c757d;
				font-size: 0.9em;
				margin-top: 8px;
			}
			.actions {
				display: flex;
				gap: 12px;
				margin-top: 20px;
			}
			.action-btn {
				background: #007acc;
				color: white;
				border: none;
				padding: 12px 24px;
				border-radius: 6px;
				cursor: pointer;
				transition: background 0.2s;
			}
			.action-btn:hover {
				background: #005a9e;
			}
		`,
		script: `
			container.querySelector('#refreshBtn').addEventListener('click', () => {
				console.log('Dashboard refresh requested');
				window.parent.postMessage({
					type: 'chat-action',
					action: 'refresh-dashboard'
				}, '*');
			});
			
			container.querySelector('#exportBtn').addEventListener('click', () => {
				console.log('Export requested');
				window.parent.postMessage({
					type: 'chat-action',
					action: 'export-data'
				}, '*');
			});
		`,
	};
}

function generateChart(item: INodeExecutionData) {
	const data = item.json;
	
	// Extract chart data from input or use defaults
	const chartData = data.chartData || data.values || [10, 25, 15, 30, 22, 35, 28];
	const labels = data.labels || data.categories || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const title = data.title || data.chartTitle || 'Data Visualization';
	
	// Generate unique ID for this chart instance
	const chartId = 'dataChart_' + Math.random().toString(36).substr(2, 9);
	
	return {
		html: `
			<div class="chart-container">
				<h3>📈 ${title}</h3>
				<canvas id="${chartId}" width="400" height="200"></canvas>
				<div class="chart-info">
					<p>Interactive chart with ${Array.isArray(chartData) ? chartData.length : 0} data points</p>
				</div>
			</div>
		`,
		css: `
			.chart-container {
				background: white;
				padding: 24px;
				border-radius: 12px;
				box-shadow: 0 4px 15px rgba(0,0,0,0.1);
				text-align: center;
			}
			.chart-container canvas {
				border: 1px solid #e1e8ed;
				border-radius: 8px;
				margin: 10px 0;
			}
			.chart-info {
				color: #6c757d;
				font-size: 0.9em;
				margin-top: 10px;
			}
		`,
		script: `
			// Wait for DOM to be ready and ensure elements exist
			let retryCount = 0;
			const maxRetries = 20;
			const chartId = '${chartId}';
			
			function initChart() {
				try {
					// Find the container - works in both chat and logs contexts
					let currentContainer = null;
					
					// Try different container contexts
					if (typeof container !== 'undefined' && container) {
						currentContainer = container;
					} else if (document.currentScript && document.currentScript.parentElement) {
						currentContainer = document.currentScript.parentElement;
					} else {
						// Fallback to document
						currentContainer = document;
					}
					
					console.log('[Rich Content] [Chart] Using container:', currentContainer);
					console.log('[Rich Content] [Chart] Looking for canvas with ID:', chartId);
					
					const canvas = currentContainer.querySelector('#' + chartId);
					if (!canvas) {
						retryCount++;
						if (retryCount < maxRetries) {
							const delay = Math.min(100 * retryCount, 2000); // Exponential backoff up to 2s
							console.warn('[Rich Content] [Chart] Canvas not found, retry', retryCount, 'in', delay, 'ms');
							setTimeout(initChart, delay);
							return;
						} else {
							console.error('[Rich Content] [Chart] Canvas not found after', maxRetries, 'retries');
							return;
						}
					}
				
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					console.error('[Rich Content] [Chart] Could not get canvas context');
					return;
				}
				
				console.log('[Rich Content] [Chart] Canvas found, starting render...');
				
				// Chart data (embedded, no external loading)
				const chartData = ${JSON.stringify(chartData)};
				const labels = ${JSON.stringify(labels)};
				
				const width = canvas.width;
				const height = canvas.height;
				const padding = 50;
				
				// Clear canvas
				ctx.clearRect(0, 0, width, height);
				
				// Draw background
				ctx.fillStyle = '#f8f9fa';
				ctx.fillRect(0, 0, width, height);
				
				// Draw grid lines
				ctx.strokeStyle = '#e1e8ed';
				ctx.lineWidth = 1;
				ctx.setLineDash([2, 2]);
				
				// Vertical grid lines
				for (let i = 0; i < chartData.length; i++) {
					const x = padding + (i * (width - 2 * padding) / (chartData.length - 1));
					ctx.beginPath();
					ctx.moveTo(x, padding);
					ctx.lineTo(x, height - padding);
					ctx.stroke();
				}
				
				// Horizontal grid lines
				const maxValue = Math.max(...chartData);
				for (let i = 0; i <= 5; i++) {
					const y = padding + (i * (height - 2 * padding) / 5);
					ctx.beginPath();
					ctx.moveTo(padding, y);
					ctx.lineTo(width - padding, y);
					ctx.stroke();
				}
				
				ctx.setLineDash([]);
				
				// Draw axes
				ctx.strokeStyle = '#333';
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(padding, height - padding);
				ctx.lineTo(width - padding, height - padding);
				ctx.moveTo(padding, height - padding);
				ctx.lineTo(padding, padding);
				ctx.stroke();
				
				// Draw data line
				const stepX = (width - 2 * padding) / (chartData.length - 1);
				const stepY = (height - 2 * padding) / maxValue;
				
				ctx.strokeStyle = '#007acc';
				ctx.lineWidth = 3;
				ctx.beginPath();
				
				chartData.forEach((value, index) => {
					const x = padding + index * stepX;
					const y = height - padding - (value * stepY);
					
					if (index === 0) {
						ctx.moveTo(x, y);
					} else {
						ctx.lineTo(x, y);
					}
				});
				
				ctx.stroke();
				
				// Draw data points
				chartData.forEach((value, index) => {
					const x = padding + index * stepX;
					const y = height - padding - (value * stepY);
					
					ctx.fillStyle = '#007acc';
					ctx.beginPath();
					ctx.arc(x, y, 6, 0, 2 * Math.PI);
					ctx.fill();
					
					// Draw value labels
					ctx.fillStyle = '#333';
					ctx.font = '12px Arial';
					ctx.textAlign = 'center';
					ctx.fillText(value.toString(), x, y - 15);
				});
				
				// Draw x-axis labels
				ctx.fillStyle = '#666';
				ctx.font = '11px Arial';
				labels.forEach((label, index) => {
					const x = padding + index * stepX;
					ctx.fillText(label, x, height - padding + 20);
				});
				
				console.log('[Rich Content] [Chart] Chart rendered successfully with embedded data');
				} catch (error) {
					console.error('[Rich Content] [Chart] Error rendering chart:', error);
				}
			}
			
			// Initialize chart when ready
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', () => {
					setTimeout(initChart, 100); // Give extra time for DOM insertion
				});
			} else {
				// Use longer timeout to ensure the HTML is fully inserted
				setTimeout(initChart, 200);
			}
		`,
	};
}

function generateForm(item: INodeExecutionData) {
	const data = item.json;
	
	// Extract form configuration from input or use defaults
	const title = data.title || data.formTitle || 'Feedback Form';
	const submitAction = data.submitAction || 'submit-feedback';
	const fields = data.fields || [
		{
			name: 'rating',
			type: 'select',
			label: 'Rating',
			required: true,
			options: [
				{ value: '5', label: '⭐⭐⭐⭐⭐ Excellent' },
				{ value: '4', label: '⭐⭐⭐⭐ Good' },
				{ value: '3', label: '⭐⭐⭐ Average' },
				{ value: '2', label: '⭐⭐ Poor' },
				{ value: '1', label: '⭐ Very Poor' }
			]
		},
		{
			name: 'comments',
			type: 'textarea',
			label: 'Comments',
			placeholder: 'Your feedback...',
			rows: 4
		}
	];
	
	// Generate form HTML dynamically
	const fieldsHtml = Array.isArray(fields) ? fields.map(field => {
		if (field.type === 'select') {
			const options = Array.isArray(field.options) ? field.options.map(opt => 
				`<option value="${opt.value}">${opt.label}</option>`
			).join('') : '';
			return `
				<div class="form-group">
					<label for="${field.name}">${field.label}:</label>
					<select name="${field.name}" id="${field.name}" ${field.required ? 'required' : ''}>
						<option value="">Select ${field.label.toLowerCase()}</option>
						${options}
					</select>
				</div>
			`;
		} else if (field.type === 'textarea') {
			return `
				<div class="form-group">
					<label for="${field.name}">${field.label}:</label>
					<textarea name="${field.name}" id="${field.name}" 
						rows="${field.rows || 4}" 
						placeholder="${field.placeholder || ''}"
						${field.required ? 'required' : ''}></textarea>
				</div>
			`;
		}
		return '';
	}).join('') : '';
	
	return {
		html: `
			<div class="form-container">
				<h3>📝 ${title}</h3>
				<form id="userFeedback">
					${fieldsHtml}
					<button type="submit" class="submit-btn">Submit ${title}</button>
				</form>
				<div id="formStatus" class="form-status" style="display: none;"></div>
			</div>
		`,
		css: `
			.form-container {
				background: white;
				padding: 24px;
				border-radius: 12px;
				box-shadow: 0 4px 15px rgba(0,0,0,0.1);
				max-width: 400px;
				margin: 0 auto;
			}
			.form-group {
				margin-bottom: 16px;
			}
			label {
				display: block;
				margin-bottom: 8px;
				font-weight: bold;
				color: #333;
			}
			select, textarea {
				width: 100%;
				padding: 12px;
				border: 1px solid #ddd;
				border-radius: 6px;
				font-size: 14px;
				box-sizing: border-box;
			}
			.submit-btn {
				background: #28a745;
				color: white;
				border: none;
				padding: 12px 24px;
				border-radius: 6px;
				cursor: pointer;
				font-size: 16px;
				width: 100%;
				transition: background 0.2s;
			}
			.submit-btn:hover {
				background: #218838;
			}
			.submit-btn:disabled {
				background: #6c757d;
				cursor: not-allowed;
			}
			.form-status {
				margin-top: 15px;
				padding: 10px;
				border-radius: 6px;
				text-align: center;
			}
			.form-status.success {
				background: #d4edda;
				color: #155724;
				border: 1px solid #c3e6cb;
			}
			.form-status.error {
				background: #f8d7da;
				color: #721c24;
				border: 1px solid #f5c6cb;
			}
		`,
		script: `
			function initForm() {
				// Find the container - works in both chat and logs contexts
				let currentContainer = null;
				
				// Try different container contexts
				if (typeof container !== 'undefined' && container) {
					currentContainer = container;
				} else if (document.currentScript && document.currentScript.parentElement) {
					currentContainer = document.currentScript.parentElement;
				} else {
					// Fallback to document
					currentContainer = document;
				}
				
				console.log('[Rich Content] Using form container:', currentContainer);
				
				const form = currentContainer.querySelector('#userFeedback');
				const statusDiv = currentContainer.querySelector('#formStatus');
				
				if (!form) {
					console.warn('[Rich Content] Form not found, retrying...');
					setTimeout(initForm, 100);
					return;
				}
				
				form.addEventListener('submit', function(e) {
					e.preventDefault(); // Prevent page refresh
					e.stopPropagation();
					
					const submitBtn = form.querySelector('.submit-btn');
					submitBtn.disabled = true;
					submitBtn.textContent = 'Submitting...';
					
					try {
						const formData = new FormData(form);
						const submitData = {};
						for (let [key, value] of formData.entries()) {
							submitData[key] = value;
						}
						
						const feedback = {
							...submitData,
							timestamp: new Date().toISOString(),
							formTitle: '${title}',
							action: '${submitAction}'
						};
						
						console.log('[Rich Content] Form submitted:', feedback);
						
						// Show success message
						if (statusDiv) {
							statusDiv.style.display = 'block';
							statusDiv.className = 'form-status success';
							statusDiv.innerHTML = '✅ Thank you for your submission!<br><small>Data logged to console</small>';
						}
						
						// Send data to parent (chat interface) if available
						if (window.parent && window.parent !== window) {
							window.parent.postMessage({
								type: 'chat-action',
								action: '${submitAction}',
								data: feedback
							}, '*');
						}
						
						// Hide form after successful submission
						setTimeout(() => {
							form.style.display = 'none';
						}, 2000);
						
					} catch (error) {
						console.error('[Rich Content] Form submission error:', error);
						if (statusDiv) {
							statusDiv.style.display = 'block';
							statusDiv.className = 'form-status error';
							statusDiv.innerHTML = '❌ Submission failed. Please try again.';
						}
						
						submitBtn.disabled = false;
						submitBtn.textContent = 'Submit ${title}';
					}
				});
				
				console.log('[Rich Content] Form initialized with submit handler');
			}
			
			// Initialize form when ready
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', initForm);
			} else {
				// Use setTimeout to ensure the HTML is inserted
				setTimeout(initForm, 10);
			}
		`,
	};
}

export class RichContentGenerator implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Rich Content Generator',
		name: 'richContentGenerator',
		icon: 'fa:magic',
		group: ['transform'],
		version: 1,
		description: 'Generates rich content for chat workflows with HTML, CSS, and interactive components',
		defaults: {
			name: 'Rich Content Generator',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'options',
				options: [
					{
						name: 'Weather Card',
						value: 'weather',
					},
					{
						name: 'Dashboard',
						value: 'dashboard',
					},
					{
						name: 'Chart',
						value: 'chart',
					},
					{
						name: 'Form',
						value: 'form',
					},
					{
						name: 'Custom',
						value: 'custom',
					},
				],
				default: 'weather',
				description: 'Type of rich content to generate',
			},
			{
				displayName: 'Template Variables',
				name: 'templateVariables',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '{}',
				description: 'JSON object with template variables to override input data (optional)',
			},
			{
				displayName: 'Custom HTML',
				name: 'customHtml',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				displayOptions: {
					show: {
						contentType: ['custom'],
					},
				},
				default: '<div class="custom-content"><h2>Custom Content</h2><p>Your content here</p></div>',
				description: 'Custom HTML content (can use {{variable}} syntax for dynamic values)',
			},
			{
				displayName: 'Custom CSS',
				name: 'customCss',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				displayOptions: {
					show: {
						contentType: ['custom'],
					},
				},
				default: `.custom-content {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	padding: 20px;
	border-radius: 10px;
	text-align: center;
}`,
				description: 'Custom CSS styles',
			},
			{
				displayName: 'Custom JavaScript',
				name: 'customScript',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				displayOptions: {
					show: {
						contentType: ['custom'],
					},
				},
				default: `console.log('Rich content loaded!');
const content = container.querySelector('.custom-content');
if (content) {
	content.addEventListener('click', () => {
		alert('Content clicked!');
	});
}`,
				description: 'Custom JavaScript code',
			},
			{
				displayName: 'Sanitization Level',
				name: 'sanitize',
				type: 'options',
				options: [
					{
						name: 'None',
						value: 'none',
						description: 'No sanitization (use with trusted content only)',
					},
					{
						name: 'Basic',
						value: 'basic',
						description: 'Basic sanitization allowing most HTML/CSS',
					},
					{
						name: 'Strict',
						value: 'strict',
						description: 'Strict sanitization allowing only safe HTML',
					},
				],
				default: 'basic',
				description: 'Level of content sanitization',
			},
		] as INodeProperties[],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const contentType = this.getNodeParameter('contentType', i) as string;
			const sanitize = this.getNodeParameter('sanitize', i) as 'none' | 'basic' | 'strict';
			const templateVariables = this.getNodeParameter('templateVariables', i) as string;
			
			// Merge template variables with input data
			let mergedData = { ...items[i].json };
			try {
				if (templateVariables && templateVariables.trim() !== '{}') {
					const variables = JSON.parse(templateVariables);
					mergedData = { ...mergedData, ...variables };
				}
			} catch (error) {
				console.warn('Invalid template variables JSON:', error);
			}
			
			// Create modified item with merged data
			const modifiedItem = { ...items[i], json: mergedData };

			let richContent;

			switch (contentType) {
				case 'weather':
					richContent = generateWeatherCard(modifiedItem);
					break;
				case 'dashboard':
					richContent = generateDashboard(modifiedItem);
					break;
				case 'chart':
					richContent = generateChart(modifiedItem);
					break;
				case 'form':
					richContent = generateForm(modifiedItem);
					break;
				case 'custom':
					let customHtml = this.getNodeParameter('customHtml', i) as string;
					let customCss = this.getNodeParameter('customCss', i) as string;
					let customScript = this.getNodeParameter('customScript', i) as string;
					
					// Simple template replacement for custom content
					const replaceTemplates = (content: string) => {
						return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
							return mergedData[key] !== undefined ? String(mergedData[key]) : match;
						});
					};
					
					customHtml = replaceTemplates(customHtml);
					customCss = replaceTemplates(customCss);
					customScript = replaceTemplates(customScript);
					
					richContent = {
						html: customHtml,
						css: customCss,
						script: customScript,
					};
					break;
				default:
					throw new Error(`Unknown content type: ${contentType}`);
			}

			returnData.push({
				json: {
					type: 'rich',
					content: {
						...richContent,
						sanitize,
					},
					// Pass through original data for workflow continuity
					...items[i].json,
				},
			});
		}

		return [returnData];
	}
} 