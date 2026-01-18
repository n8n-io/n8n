const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 24 }] } },
				position: [-960, 240],
				name: 'Schedule Daily Check',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleAds',
			version: 1,
			config: {
				parameters: { requestOptions: {}, additionalOptions: {} },
				position: [-736, 240],
				name: 'Fetch Google Ads Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"// AI-powered campaign performance analysis\nconst items = $input.all();\nconst analyzedItems = [];\n\nfor (const item of items) {\n  const data = item.json;\n  let performanceScore = 0;\n  let insights = [];\n  let recommendations = [];\n  let alertLevel = 'normal';\n  \n  // Extract metrics\n  const clicks = data.metrics?.clicks || 0;\n  const impressions = data.metrics?.impressions || 0;\n  const cost = (data.metrics?.cost_micros || 0) / 1000000;\n  const conversions = data.metrics?.conversions || 0;\n  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;\n  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;\n  const costPerConversion = conversions > 0 ? cost / conversions : 0;\n  const avgCpc = clicks > 0 ? cost / clicks : 0;\n  \n  // CTR Analysis (Click-Through Rate)\n  if (ctr >= 5) {\n    performanceScore += 30;\n    insights.push(`Excellent CTR: ${ctr.toFixed(2)}% (+30 points)`);\n  } else if (ctr >= 3) {\n    performanceScore += 20;\n    insights.push(`Good CTR: ${ctr.toFixed(2)}% (+20 points)`);\n  } else if (ctr >= 1.5) {\n    performanceScore += 10;\n    insights.push(`Average CTR: ${ctr.toFixed(2)}% (+10 points)`);\n    recommendations.push('Consider A/B testing ad copy to improve CTR');\n  } else {\n    insights.push(`Low CTR: ${ctr.toFixed(2)}% (0 points)`);\n    recommendations.push('URGENT: Review ad relevance and targeting');\n    alertLevel = 'warning';\n  }\n  \n  // Conversion Rate Analysis\n  if (conversionRate >= 10) {\n    performanceScore += 35;\n    insights.push(`Outstanding conversion rate: ${conversionRate.toFixed(2)}% (+35 points)`);\n  } else if (conversionRate >= 5) {\n    performanceScore += 25;\n    insights.push(`Strong conversion rate: ${conversionRate.toFixed(2)}% (+25 points)`);\n  } else if (conversionRate >= 2) {\n    performanceScore += 15;\n    insights.push(`Moderate conversion rate: ${conversionRate.toFixed(2)}% (+15 points)`);\n    recommendations.push('Optimize landing pages for better conversions');\n  } else {\n    insights.push(`Low conversion rate: ${conversionRate.toFixed(2)}% (0 points)`);\n    recommendations.push('CRITICAL: Review landing page experience and targeting');\n    alertLevel = 'critical';\n  }\n  \n  // Cost Efficiency Analysis\n  if (costPerConversion > 0) {\n    if (costPerConversion <= 25) {\n      performanceScore += 25;\n      insights.push(`Excellent cost per conversion: $${costPerConversion.toFixed(2)} (+25 points)`);\n    } else if (costPerConversion <= 50) {\n      performanceScore += 15;\n      insights.push(`Good cost per conversion: $${costPerConversion.toFixed(2)} (+15 points)`);\n    } else if (costPerConversion <= 100) {\n      performanceScore += 8;\n      insights.push(`Fair cost per conversion: $${costPerConversion.toFixed(2)} (+8 points)`);\n      recommendations.push('Look for ways to reduce cost per conversion');\n    } else {\n      insights.push(`High cost per conversion: $${costPerConversion.toFixed(2)} (0 points)`);\n      recommendations.push('URGENT: Review bid strategy and audience targeting');\n      alertLevel = alertLevel === 'critical' ? 'critical' : 'warning';\n    }\n  }\n  \n  // Volume Analysis\n  if (clicks >= 1000) {\n    performanceScore += 10;\n    insights.push(`High traffic volume: ${clicks} clicks (+10 points)`);\n  } else if (clicks >= 500) {\n    performanceScore += 5;\n    insights.push(`Good traffic volume: ${clicks} clicks (+5 points)`);\n  } else if (clicks < 100) {\n    insights.push(`Low traffic volume: ${clicks} clicks (0 points)`);\n    recommendations.push('Consider increasing budget or expanding targeting');\n  }\n  \n  // Determine performance tier\n  let performanceTier = 'Underperforming';\n  if (performanceScore >= 75) {\n    performanceTier = 'Excellent';\n  } else if (performanceScore >= 55) {\n    performanceTier = 'Good';\n  } else if (performanceScore >= 35) {\n    performanceTier = 'Fair';\n  }\n  \n  // Add strategic recommendations\n  if (performanceTier === 'Excellent') {\n    recommendations.push('Scale this campaign - increase budget by 20-30%');\n    recommendations.push('Use this as a template for new campaigns');\n  } else if (performanceTier === 'Good') {\n    recommendations.push('Test incremental budget increases');\n    recommendations.push('Identify top-performing ad groups to scale');\n  }\n  \n  analyzedItems.push({\n    json: {\n      ...data,\n      campaignId: data.campaign?.id,\n      campaignName: data.campaign?.name,\n      campaignStatus: data.campaign?.status,\n      performanceScore: performanceScore,\n      performanceTier: performanceTier,\n      alertLevel: alertLevel,\n      insights: insights,\n      recommendations: recommendations,\n      metrics: {\n        clicks: clicks,\n        impressions: impressions,\n        cost: cost.toFixed(2),\n        conversions: conversions,\n        ctr: ctr.toFixed(2),\n        conversionRate: conversionRate.toFixed(2),\n        costPerConversion: costPerConversion.toFixed(2),\n        avgCpc: avgCpc.toFixed(2)\n      },\n      analyzedAt: new Date().toISOString()\n    }\n  });\n}\n\nreturn analyzedItems;",
				},
				position: [-512, 240],
				name: 'AI Performance Analysis',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.googleSheets',
					version: 4.4,
					config: {
						parameters: {
							columns: {
								value: {
									CPC: '${{ $json.metrics.avgCpc }}',
									CTR: '={{ $json.metrics.ctr }}%',
									Cost: '={{ $json.metrics.cost }}',
									Date: "={{ $now.toFormat('yyyy-MM-dd') }}",
									Tier: '={{ $json.performanceTier }}',
									Score: '={{ $json.performanceScore }}',
									Clicks: '={{ $json.metrics.clicks }}',
									Status: '={{ $json.campaignStatus }}',
									Campaign: '={{ $json.campaignName }}',
									'Conv Rate': '={{ $json.metrics.conversionRate }}%',
									'Cost/Conv': '${{ $json.metrics.costPerConversion }}',
									Conversions: '={{ $json.metrics.conversions }}',
									Impressions: '={{ $json.metrics.impressions }}',
								},
								mappingMode: 'defineBelow',
							},
							options: {},
							operation: 'appendOrUpdate',
							sheetName: {
								__rl: true,
								mode: 'list',
								value: 'gid=0',
								cachedResultName: 'Daily Performance',
							},
							documentId: {
								__rl: true,
								mode: 'list',
								value: 'your-dashboard-spreadsheet-id',
								cachedResultName: 'PPC Performance Dashboard',
							},
						},
						position: [160, 48],
						name: 'Update Campaign Dashboard',
					},
				}),
				node({
					type: 'n8n-nodes-base.googleSheets',
					version: 4.4,
					config: {
						parameters: {
							columns: {
								value: {
									CPC: '${{ $json.metrics.avgCpc }}',
									CTR: '={{ $json.metrics.ctr }}%',
									Cost: '={{ $json.metrics.cost }}',
									Date: "={{ $now.toFormat('yyyy-MM-dd') }}",
									Tier: '={{ $json.performanceTier }}',
									Score: '={{ $json.performanceScore }}',
									Clicks: '={{ $json.metrics.clicks }}',
									Status: '={{ $json.campaignStatus }}',
									Campaign: '={{ $json.campaignName }}',
									'Conv Rate': '={{ $json.metrics.conversionRate }}%',
									'Cost/Conv': '${{ $json.metrics.costPerConversion }}',
									Conversions: '={{ $json.metrics.conversions }}',
									Impressions: '={{ $json.metrics.impressions }}',
								},
								mappingMode: 'defineBelow',
							},
							options: {},
							operation: 'appendOrUpdate',
							sheetName: {
								__rl: true,
								mode: 'list',
								value: 'gid=0',
								cachedResultName: 'Daily Performance',
							},
							documentId: {
								__rl: true,
								mode: 'list',
								value: 'your-dashboard-spreadsheet-id',
								cachedResultName: 'PPC Performance Dashboard',
							},
						},
						position: [160, 48],
						name: 'Update Campaign Dashboard',
					},
				}),
			],
			{
				version: 2,
				parameters: {
					options: {},
					conditions: {
						options: {
							leftValue: '',
							caseSensitive: false,
							typeValidation: 'strict',
						},
						combinator: 'or',
						conditions: [
							{
								id: 'excellent',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.performanceTier }}',
								rightValue: 'Excellent',
							},
							{
								id: 'good',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.performanceTier }}',
								rightValue: 'Good',
							},
						],
					},
				},
				name: 'Route by Performance',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.3,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: 'total-campaigns',
								name: 'totalCampaigns',
								type: 'number',
								value: '={{ $input.all().length }}',
							},
							{
								id: 'excellent-count',
								name: 'excellentCampaigns',
								type: 'number',
								value:
									"={{ $input.all().filter(item => item.json.performanceTier === 'Excellent').length }}",
							},
							{
								id: 'good-count',
								name: 'goodCampaigns',
								type: 'number',
								value:
									"={{ $input.all().filter(item => item.json.performanceTier === 'Good').length }}",
							},
							{
								id: 'fair-count',
								name: 'fairCampaigns',
								type: 'number',
								value:
									"={{ $input.all().filter(item => item.json.performanceTier === 'Fair').length }}",
							},
							{
								id: 'under-count',
								name: 'underperformingCampaigns',
								type: 'number',
								value:
									"={{ $input.all().filter(item => item.json.performanceTier === 'Underperforming').length }}",
							},
							{
								id: 'total-spend',
								name: 'totalSpend',
								type: 'string',
								value:
									'=${{ $input.all().reduce((sum, item) => sum + parseFloat(item.json.metrics.cost || 0), 0).toFixed(2) }}',
							},
							{
								id: 'total-conversions',
								name: 'totalConversions',
								type: 'number',
								value:
									'={{ $input.all().reduce((sum, item) => sum + parseInt(item.json.metrics.conversions || 0), 0) }}',
							},
							{
								id: 'summary-text',
								name: 'dailySummary',
								type: 'string',
								value:
									"📊 Daily PPC Performance Summary\n\n{{ $('Generate Daily Summary').item.json.totalCampaigns }} campaigns analyzed:\n• {{ $('Generate Daily Summary').item.json.excellentCampaigns }} Excellent 🚀\n• {{ $('Generate Daily Summary').item.json.goodCampaigns }} Good ✅\n• {{ $('Generate Daily Summary').item.json.fairCampaigns }} Fair ⚠️\n• {{ $('Generate Daily Summary').item.json.underperformingCampaigns }} Underperforming 🔴\n\nTotal Spend: ${{ $('Generate Daily Summary').item.json.totalSpend }}\nTotal Conversions: {{ $('Generate Daily Summary').item.json.totalConversions }}",
							},
						],
					},
				},
				position: [384, 144],
				name: 'Generate Daily Summary',
			},
		}),
	)
	// Disconnected: Log All Campaigns
	.add(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.4,
			config: {
				parameters: {
					columns: {
						value: {
							Cost: '${{ $json.metrics.cost }}',
							Tier: '={{ $json.performanceTier }}',
							Score: '={{ $json.performanceScore }}',
							Campaign: '={{ $json.campaignName }}',
							'Cost/Conv': '${{ $json.metrics.costPerConversion }}',
							Timestamp: '={{ $now.toISO() }}',
							'Alert Level': '={{ $json.alertLevel }}',
							Conversions: '={{ $json.metrics.conversions }}',
						},
						mappingMode: 'defineBelow',
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=1',
						cachedResultName: 'Campaign Log',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: 'your-dashboard-spreadsheet-id',
						cachedResultName: 'PPC Performance Dashboard',
					},
				},
				position: [-64, 432],
				name: 'Log All Campaigns',
			},
		}),
	)
	// Disconnected: Alert: Scale Opportunity
	.add(
		node({
			type: 'n8n-nodes-base.slack',
			version: 2.1,
			config: {
				parameters: {
					text: "🚀 *SCALE OPPORTUNITY DETECTED*\n\n*Campaign:* {{ $json.campaignName }}\n*Performance Score:* {{ $json.performanceScore }}/100\n*Tier:* {{ $json.performanceTier }}\n\n*Key Metrics:*\n• Conversions: {{ $json.metrics.conversions }}\n• Conversion Rate: {{ $json.metrics.conversionRate }}%\n• Cost/Conversion: ${{ $json.metrics.costPerConversion }}\n• CTR: {{ $json.metrics.ctr }}%\n• Total Spend: ${{ $json.metrics.cost }}\n\n*Performance Insights:*\n{{ $json.insights.join('\\n') }}\n\n*💡 Recommendations:*\n{{ $json.recommendations.join('\\n') }}\n\n_Action: Consider scaling this campaign!_",
					otherOptions: {},
				},
				position: [-64, -96],
				name: 'Alert: Scale Opportunity',
			},
		}),
	)
	// Disconnected: Generate Action Plan
	.add(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"// Generate detailed action plan based on performance\nconst items = $input.all();\nconst actionPlanItems = [];\n\nfor (const item of items) {\n  const data = item.json;\n  const tier = data.performanceTier || 'Fair';\n  const campaignName = data.campaignName || 'Campaign';\n  const alertLevel = data.alertLevel || 'normal';\n  \n  let emailSubject = '';\n  let emailBody = '';\n  let priority = 'Medium';\n  \n  if (tier === 'Excellent' || tier === 'Good') {\n    priority = 'High';\n    emailSubject = `✅ ${campaignName}: Scaling Opportunity Detected`;\n    emailBody = `Hi PPC Team,\n\nGreat news! Your campaign \"${campaignName}\" is performing exceptionally well.\n\n📊 PERFORMANCE SUMMARY\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nPerformance Score: ${data.performanceScore}/100\nPerformance Tier: ${tier}\nDaily Spend: $${data.metrics.cost}\nConversions: ${data.metrics.conversions}\nConversion Rate: ${data.metrics.conversionRate}%\nCost per Conversion: $${data.metrics.costPerConversion}\n\n💡 KEY INSIGHTS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${data.insights.map((insight, i) => `${i + 1}. ${insight}`).join('\\n')}\n\n🎯 RECOMMENDED ACTIONS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${data.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\\n')}\n\n📈 SCALING STRATEGY\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Increase daily budget by 20-30%\n• Monitor performance closely for next 3-5 days\n• If metrics hold, continue scaling gradually\n• Consider duplicating successful ad groups\n• Test expansion to similar audiences\n\nThis campaign is ready to scale. Let's capitalize on this momentum!\n\nBest,\nAutomated PPC Intelligence System`;\n  } else if (alertLevel === 'critical' || alertLevel === 'warning') {\n    priority = 'Urgent';\n    emailSubject = `⚠️ ${campaignName}: Performance Issues Detected`;\n    emailBody = `Hi PPC Team,\n\n⚠️ ATTENTION REQUIRED\n\nYour campaign \"${campaignName}\" requires immediate attention due to performance concerns.\n\n📊 PERFORMANCE SUMMARY\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nPerformance Score: ${data.performanceScore}/100\nPerformance Tier: ${tier}\nAlert Level: ${alertLevel.toUpperCase()}\nDaily Spend: $${data.metrics.cost}\nConversions: ${data.metrics.conversions}\nConversion Rate: ${data.metrics.conversionRate}%\nCost per Conversion: $${data.metrics.costPerConversion}\n\n⚠️ IDENTIFIED ISSUES\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${data.insights.map((insight, i) => `${i + 1}. ${insight}`).join('\\n')}\n\n🔧 REQUIRED ACTIONS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${data.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\\n')}\n\n🚨 IMMEDIATE NEXT STEPS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n1. Review campaign settings and targeting\n2. Analyze recent changes that may have impacted performance\n3. Check landing page experience and load times\n4. Review competitor activity\n5. Consider pausing low-performing ad groups\n6. Test new ad variations\n\nPlease address these issues within 24 hours to prevent budget waste.\n\nBest,\nAutomated PPC Intelligence System`;\n  } else {\n    emailSubject = `📊 ${campaignName}: Daily Performance Report`;\n    emailBody = `Hi PPC Team,\n\nHere's your daily performance summary for \"${campaignName}\".\n\n📊 PERFORMANCE SUMMARY\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nPerformance Score: ${data.performanceScore}/100\nPerformance Tier: ${tier}\nDaily Spend: $${data.metrics.cost}\nConversions: ${data.metrics.conversions}\nConversion Rate: ${data.metrics.conversionRate}%\nCost per Conversion: $${data.metrics.costPerConversion}\n\n💡 INSIGHTS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${data.insights.map((insight, i) => `${i + 1}. ${insight}`).join('\\n')}\n\n📋 RECOMMENDATIONS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${data.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\\n')}\n\nContinue monitoring and optimizing for best results.\n\nBest,\nAutomated PPC Intelligence System`;\n  }\n  \n  actionPlanItems.push({\n    json: {\n      ...data,\n      emailSubject: emailSubject,\n      emailBody: emailBody,\n      priority: priority,\n      actionRequired: alertLevel === 'critical' || alertLevel === 'warning',\n      scaleRecommended: tier === 'Excellent' || tier === 'Good'\n    }\n  });\n}\n\nreturn actionPlanItems;",
				},
				position: [-64, 240],
				name: 'Generate Action Plan',
			},
		}),
	)
	// Disconnected: Email Performance Report
	.add(
		node({
			type: 'n8n-nodes-base.emailSend',
			version: 2.1,
			config: {
				parameters: {
					options: { replyTo: 'user@example.com', allowUnauthorizedCerts: false },
					subject: '={{ $json.emailSubject }}',
					toEmail: 'user@example.com',
					fromEmail: 'user@example.com',
				},
				position: [160, 240],
				name: 'Email Performance Report',
			},
		}),
	)
	// Disconnected: Alert: Issues Detected
	.add(
		node({
			type: 'n8n-nodes-base.slack',
			version: 2.1,
			config: {
				parameters: {
					text: "⚠️ *PERFORMANCE ALERT*\n\n*Campaign:* {{ $json.campaignName }}\n*Alert Level:* {{ $json.alertLevel }}\n*Performance Score:* {{ $json.performanceScore }}/100\n*Tier:* {{ $json.performanceTier }}\n\n*Current Metrics:*\n• Cost: ${{ $json.metrics.cost }}\n• Conversions: {{ $json.metrics.conversions }}\n• Cost/Conversion: ${{ $json.metrics.costPerConversion }}\n• Conversion Rate: {{ $json.metrics.conversionRate }}%\n\n*⚠️ Issues Identified:*\n{{ $json.insights.join('\\n') }}\n\n_Action Required: Review and optimize within 24 hours_",
					otherOptions: {},
				},
				position: [-64, 624],
				name: 'Alert: Issues Detected',
			},
		}),
	)
	.add(
		sticky(
			'# 📊 PPC Campaign Intelligence System\n\nAutomatically monitors Google Ads campaigns daily, analyzes performance with AI scoring, and alerts your team about scaling opportunities or issues requiring attention.\n\n**AI Analysis:** Evaluates CTR, conversion rate, cost efficiency, and traffic volume to assign performance scores (0-100).\n\n**Setup:**\n- Connect Google Ads, Sheets, Slack, SMTP\n- Update spreadsheet IDs and Slack channels\n- Customize scoring thresholds in code\n- Adjust email recipients\n\n**Benefits:**\n- Never miss scaling opportunities\n- Catch underperforming campaigns early\n- Data-driven optimization decisions\n- Automated daily reporting\n\n*Built by Daniel Shashko*\n[Connect on LinkedIn](https://www.linkedin.com/in/daniel-shashko/)',
			{ position: [-1552, 64], width: 500, height: 572 },
		),
	)
	.add(
		sticky('Triggers workflow automatically every morning at 9 AM daily', {
			name: 'Sticky Note1',
			position: [-992, 112],
			width: 160,
			height: 96,
		}),
	)
	.add(
		sticky('Pulls all campaign metrics from Google Ads API', {
			name: 'Sticky Note2',
			position: [-768, 112],
			width: 160,
			height: 96,
		}),
	)
	.add(
		sticky('Scores campaigns based on CTR, conversions, and cost efficiency\n', {
			name: 'Sticky Note3',
			position: [-544, 112],
			width: 160,
			height: 96,
		}),
	)
	.add(
		sticky('Splits campaigns into high-performers versus worst ones', {
			name: 'Sticky Note4',
			position: [-320, 112],
			width: 160,
			height: 96,
		}),
	)
	.add(
		sticky('Records all campaign data to historical log spreadsheet\n', {
			name: 'Sticky Note5',
			position: [-256, 432],
			width: 160,
			height: 96,
		}),
	)
	.add(
		sticky('Logs daily metrics to Google Sheets performance tracking tab', {
			name: 'Sticky Note6',
			position: [128, -80],
			width: 160,
			height: 96,
		}),
	)
	.add(
		sticky('Sends Slack notification for excellent performing campaigns ready to scale', {
			name: 'Sticky Note7',
			position: [-272, -96],
			width: 160,
			height: 128,
		}),
	)
	.add(
		sticky('Sends Slack warning for underperforming campaigns requiring immediate action\n', {
			name: 'Sticky Note8',
			position: [-256, 624],
			width: 160,
			height: 128,
		}),
	)
	.add(
		sticky('Creates customized email reports based on campaign performance tier\n', {
			name: 'Sticky Note9',
			position: [-96, 112],
			width: 160,
			height: 96,
		}),
	)
	.add(
		sticky('Sends personalized action plan emails to PPC team members\n', {
			name: 'Sticky Note10',
			position: [128, 416],
			width: 160,
			height: 96,
		}),
	)
	.add(
		sticky('Calculates total spend, conversions, and campaign distribution summary', {
			name: 'Sticky Note11',
			position: [352, 16],
			width: 160,
			height: 96,
		}),
	);
