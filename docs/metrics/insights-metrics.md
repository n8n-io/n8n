# n8n Insights Metrics

This document describes how n8n exposes Insights metrics to Prometheus for integration with monitoring systems like Datadog, Grafana, etc.

## Overview

n8n Insights provides valuable analytics about your workflow executions, success rates, time saved, and more. This feature bridges the gap between n8n's internal Insights system and external monitoring tools by exposing key Insights metrics as Prometheus metrics.

## Configuration

To enable Insights metrics, set the following environment variable:

```
N8N_METRICS=true
N8N_METRICS_INCLUDE_INSIGHTS_METRICS=true
```

This will expose the Insights metrics on the `/metrics` endpoint along with other n8n metrics.

## Available Metrics

The following Insights metrics are exposed:

| Metric Name | Description | Labels |
|-------------|-------------|--------|
| `n8n_insights_avg_runtime_ms` | Average workflow execution runtime in milliseconds | `period`, `project_id` |
| `n8n_insights_failures` | Number of failed workflow executions | `period`, `project_id` |
| `n8n_insights_failure_rate` | Workflow execution failure rate (0-1) | `period`, `project_id` |
| `n8n_insights_time_saved_min` | Time saved by workflow automation in minutes | `period`, `project_id` |
| `n8n_insights_total_executions` | Total number of workflow executions | `period`, `project_id` |

### Labels

* `period`: The time period the metric refers to (e.g., 'current')
* `project_id`: The ID of the project the workflows belong to (or 'none' if no project)

## Integration with Monitoring Systems

### Datadog

To visualize these metrics in Datadog:

1. Ensure you have the Datadog agent configured to scrape Prometheus metrics from n8n
2. Create custom dashboards using the metrics above
3. Set up alerts on key metrics, such as high failure rates or increased execution times

Example Datadog query for average runtime:

```
avg:n8n_insights_avg_runtime_ms{period:current} by {project_id}
```

### Grafana

For Grafana, create panels with queries like:

```
n8n_insights_failure_rate{period="current"}
```

## Use Cases

* **Operational Monitoring**: Track workflow execution failures across projects
* **Performance Tracking**: Monitor average execution times to identify performance issues
* **Business Value Measurement**: Visualize time saved metrics alongside other business KPIs
* **Cross-team Visibility**: Provide each team with dashboards for their project's workflows

## How It Works

When n8n calculates Insights metrics (e.g., when you view the Insights dashboard), it emits events that are captured by the Prometheus metrics system. These metrics are then exposed via the `/metrics` endpoint for scraping by monitoring systems.

This provides real-time visibility into the same metrics you see in the n8n Insights UI, but makes them available for external monitoring and alerting systems.