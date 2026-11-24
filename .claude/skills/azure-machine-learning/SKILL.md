---
name: azure-machine-learning
description: Expert knowledge for Azure Machine Learning development including troubleshooting, best practices, decision making, architecture & design patterns, limits & quotas, security, configuration, integrations & coding patterns, and deployment. Use when using AutoML, Prompt Flow, online/batch endpoints, vector stores/RAG, or Model Catalog in Azure ML, and other Azure Machine Learning related development tasks. Not for Azure Databricks (use azure-databricks), Azure Synapse Analytics (use azure-synapse-analytics), Azure Data Science Virtual Machines (use azure-data-science-vm), Azure HDInsight (use azure-hdinsight).
compatibility: Requires network access. Uses mcp_microsoftdocs:microsoft_docs_fetch or fetch_webpage to retrieve documentation.
metadata:
  generated_at: "2026-10-18"
  generator: "docs2skills/1.0.0"
---
# Azure Machine Learning Skill

This skill provides expert guidance for Azure Machine Learning. Covers troubleshooting, best practices, decision making, architecture & design patterns, limits & quotas, security, configuration, integrations & coding patterns, and deployment. It combines local quick-reference content with remote documentation fetching capabilities.

## How to Use This Skill

> **IMPORTANT for Agent**: Use the **Category Index** below to locate relevant sections. For categories with line ranges (e.g., `L35-L120`), use `read_file` with the specified lines. For categories with file links (e.g., `[security.md](security.md)`), use `read_file` on the linked reference file

> **IMPORTANT for Agent**: If `metadata.generated_at` is more than 3 months old, suggest the user pull the latest version from the repository. If `mcp_microsoftdocs` tools are not available, suggest the user install it: [Installation Guide](https://github.com/MicrosoftDocs/mcp/blob/main/README.md)

This skill requires **network access** to fetch documentation content:
- **Preferred**: Use `mcp_microsoftdocs:microsoft_docs_fetch` with query string `from=learn-agent-skill`. Returns Markdown.
- **Fallback**: Use `fetch_webpage` with query string `from=learn-agent-skill&accept=text/markdown`. Returns Markdown.

## Category Index

| Category | Lines | Description |
|----------|-------|-------------|
| Troubleshooting | L37-L65 | Diagnosing and fixing Azure ML failures and errors across pipelines, endpoints, AutoML, networking, Kubernetes, environments, data access, prompt flow, and known platform issues. |
| Best Practices | L66-L80 | Guidance on optimizing AutoML and training, handling imbalance/overfitting, preparing data, batch/inference performance, monitoring models, and reducing Azure ML compute and cost. |
| Decision Making | L81-L108 | Guides for planning and making migration, upgrade, networking, DR, data, compute, deployment, and monitoring decisions across Azure ML v1/v2, Fabric, Prompt Flow, and Agent Framework. |
| Architecture & Design Patterns | L109-L114 | Designing real-time inference architectures with online endpoints and building RAG solutions using Azure ML vector stores, including deployment, scaling, and integration patterns. |
| Limits & Quotas | L115-L124 | Limits, quotas, and availability for Azure ML: regional/sovereign support, VM SKUs, workspace soft delete, and capacity planning for managed online endpoints. |
| Security | L125-L174 | Securing Azure ML: encryption, keys, identity/RBAC, secrets, network isolation/VNets, private endpoints, policy/compliance, and secure access to compute, storage, endpoints, and Model Catalog. |
| Configuration | L175-L408 | Configuring Azure ML components, compute, networking, AutoML, YAML schemas, monitoring, and Prompt Flow so you can build, train, deploy, and manage ML workflows and infrastructure. |
| Integrations & Coding Patterns | L409-L451 | Integrating Azure ML with data platforms, REST/MLflow APIs, Spark, Databricks/Synapse/Fabric, and building/debugging prompt flow/RAG tools and deployments. |
| Deployment | L452-L481 | Deploying and operationalizing models and pipelines on Azure ML (online/batch endpoints, CI/CD, MLOps, prompt flow, RAG, HF/MLflow/ONNX), including rollout strategies and cross-workspace/registry use. |

### Troubleshooting
| Topic | URL |
|-------|-----|
| Troubleshoot Azure ML designer component error codes | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/designer-error-codes?view=azureml-api-2 |
| Resolve common Azure AutoML forecasting issues | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-automl-forecasting-faq?view=azureml-api-2 |
| Debug Azure ML online endpoints locally with VS Code | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-debug-managed-online-endpoints-visual-studio-code?view=azureml-api-2 |
| Diagnose and fix Azure ML pipeline failures in studio | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-debug-pipeline-failure?view=azureml-api-2 |
| Troubleshoot Azure ML pipeline performance with profiling | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-debug-pipeline-performance?view=azureml-api-2 |
| Diagnose and fix Azure ML pipeline reuse issues | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-debug-pipeline-reuse-issues?view=azureml-api-2 |
| Troubleshoot Azure automated ML experiment failures | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-troubleshoot-auto-ml?view=azureml-api-2 |
| Troubleshoot Azure ML batch endpoints and jobs | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-troubleshoot-batch-endpoints?view=azureml-api-2 |
| Troubleshoot data access issues in Azure ML SDK v2 | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-troubleshoot-data-access?view=azureml-api-2 |
| Troubleshoot Azure ML data labeling project creation | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-troubleshoot-data-labeling?view=azureml-api-2 |
| Troubleshoot Azure ML environment image build failures | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-troubleshoot-environments?view=azureml-api-2 |
| Troubleshoot Azure ML Kubernetes compute workloads | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-troubleshoot-kubernetes-compute?view=azureml-api-2 |
| Troubleshoot Azure ML Kubernetes extension deployment | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-troubleshoot-kubernetes-extension?view=azureml-api-2 |
| Diagnose Azure ML managed virtual network issues | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-troubleshoot-managed-network?view=azureml-api-2 |
| Troubleshoot Azure ML online endpoint deployment and scoring errors | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-troubleshoot-online-endpoints?view=azureml-api-2 |
| Resolve 'descriptors cannot be created directly' in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-troubleshoot-protobuf-descriptor-error?view=azureml-api-2 |
| Troubleshoot private endpoint access to Azure ML workspaces | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-troubleshoot-secure-connection-workspace?view=azureml-api-2 |
| Fix 'Validation for schema failed' errors in Azure ML CLI v2 | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-troubleshoot-validation-for-schema-failed-error?view=azureml-api-2 |
| Diagnose and fix Azure ML workspace issues | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-workspace-diagnostic-api?view=azureml-api-2 |
| Review Azure Machine Learning current known issues | https://learn.microsoft.com/en-us/azure/machine-learning/known-issues/azure-machine-learning-known-issues?view=azureml-api-2 |
| Known issue: Invalid certificate during AKS deployment | https://learn.microsoft.com/en-us/azure/machine-learning/known-issues/inferencing-invalid-certificate?view=azureml-api-2 |
| Known issue: Updating Azure ML Kubernetes compute fails | https://learn.microsoft.com/en-us/azure/machine-learning/known-issues/inferencing-updating-kubernetes-compute-appears-to-succeed?view=azureml-api-2 |
| Troubleshoot common prompt flow issues in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/troubleshoot-guidance?view=azureml-api-2 |
| Troubleshoot common prompt flow issues in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/troubleshoot-guidance?view=azureml-api-2 |
| Troubleshoot Azure ML managed feature store errors | https://learn.microsoft.com/en-us/azure/machine-learning/troubleshooting-managed-feature-store?view=azureml-api-2 |

### Best Practices
| Topic | URL |
|-------|-----|
| Mitigate overfitting and imbalance in Azure AutoML | https://learn.microsoft.com/en-us/azure/machine-learning/concept-manage-ml-pitfalls?view=azureml-api-2 |
| Understand Azure ML model monitoring concepts and practices | https://learn.microsoft.com/en-us/azure/machine-learning/concept-model-monitoring?view=azureml-api-2 |
| Optimize and manage Azure Machine Learning costs | https://learn.microsoft.com/en-us/azure/machine-learning/concept-plan-manage-cost?view=azureml-api-2 |
| Design feature set transformations in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/feature-set-specification-transformation-concepts?view=azureml-api-2 |
| Author batch scoring scripts for AML batch deployments | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-batch-scoring-script?view=azureml-api-2 |
| Tune Azure ML Kubernetes inference router performance | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-kubernetes-inference-routing-azureml-fe?view=azureml-api-2 |
| Optimize Azure Machine Learning compute costs | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-optimize-cost?view=azureml-api-2 |
| Prepare image datasets for Azure AutoML vision | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-prepare-datasets-for-automl-images?view=azureml-api-2 |
| Apply distributed GPU training patterns in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-train-distributed-gpu?view=azureml-api-2 |
| Optimize AutoML for small object detection in images | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-automl-small-object-detect?view=azureml-api-2 |
| Optimize checkpoint performance for large Azure ML models with Nebula | https://learn.microsoft.com/en-us/azure/machine-learning/reference-checkpoint-performance-for-large-models?view=azureml-api-2 |

### Decision Making
| Topic | URL |
|-------|-----|
| Choose between managed and custom network isolation in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/concept-network-isolation-configurations?view=azureml-api-2 |
| Choose migration paths from Azure ML Data Import to Fabric | https://learn.microsoft.com/en-us/azure/machine-learning/data-import-migration-guide?view=azureml-api-2 |
| Plan failover and disaster recovery for Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-high-availability-machine-learning?view=azureml-api-2 |
| Manage and migrate imported data assets in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-imported-data-assets?view=azureml-api-2 |
| Decide and plan migration from Azure ML v1 to v2 | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-migrate-from-v1?view=azureml-api-2 |
| Move Azure ML workspaces between subscriptions | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-move-workspace?view=azureml-api-2 |
| Plan Azure ML network isolation architecture | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-network-isolation-planning?view=azureml-api-2 |
| Select and use vendor companies for Azure ML data labeling | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-outsource-data-labeling?view=azureml-api-2 |
| Map Azure ML v1 datasets to v2 data assets | https://learn.microsoft.com/en-us/azure/machine-learning/migrate-to-v2-assets-data?view=azureml-api-2 |
| Migrate Azure ML model management from SDK v1 to v2 | https://learn.microsoft.com/en-us/azure/machine-learning/migrate-to-v2-assets-model?view=azureml-api-2 |
| Upgrade Azure ML script runs to v2 command jobs | https://learn.microsoft.com/en-us/azure/machine-learning/migrate-to-v2-command-job?view=azureml-api-2 |
| Migrate Azure ML deployment endpoints from SDK v1 to v2 | https://learn.microsoft.com/en-us/azure/machine-learning/migrate-to-v2-deploy-endpoints?view=azureml-api-2 |
| Upgrade Azure ML pipeline endpoints from v1 to v2 | https://learn.microsoft.com/en-us/azure/machine-learning/migrate-to-v2-deploy-pipelines?view=azureml-api-2 |
| Upgrade Azure ML AutoML workflows from SDK v1 to v2 | https://learn.microsoft.com/en-us/azure/machine-learning/migrate-to-v2-execution-automl?view=azureml-api-2 |
| Migrate Azure ML hyperparameter tuning to v2 sweep jobs | https://learn.microsoft.com/en-us/azure/machine-learning/migrate-to-v2-execution-hyperdrive?view=azureml-api-2 |
| Migrate Azure ML parallel run step to SDK v2 parallel job | https://learn.microsoft.com/en-us/azure/machine-learning/migrate-to-v2-execution-parallel-run-step?view=azureml-api-2 |
| Upgrade Azure ML pipelines from SDK v1 to v2 jobs | https://learn.microsoft.com/en-us/azure/machine-learning/migrate-to-v2-execution-pipeline?view=azureml-api-2 |
| Migrate Azure ML local runs from SDK v1 to v2 | https://learn.microsoft.com/en-us/azure/machine-learning/migrate-to-v2-local-runs?view=azureml-api-2 |
| Upgrade ACI web services to Azure ML managed online endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/migrate-to-v2-managed-online-endpoints?view=azureml-api-2 |
| Compare and migrate Azure ML compute management v1 to v2 | https://learn.microsoft.com/en-us/azure/machine-learning/migrate-to-v2-resource-compute?view=azureml-api-2 |
| Migrate datastore management from AML v1 to v2 | https://learn.microsoft.com/en-us/azure/machine-learning/migrate-to-v2-resource-datastore?view=azureml-api-2 |
| Decide how to upgrade Azure ML workspaces to SDK v2 | https://learn.microsoft.com/en-us/azure/machine-learning/migrate-to-v2-resource-workspace?view=azureml-api-2 |
| Select and interpret Azure ML generative AI monitoring metrics | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/concept-model-monitoring-generative-ai-evaluation-metrics?view=azureml-api-2 |
| Plan migration from Prompt Flow to Agent Framework | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/migrate-prompt-flow-to-agent-framework?view=azureml-api-2 |

### Architecture & Design Patterns
| Topic | URL |
|-------|-----|
| Plan real-time inference with Azure ML online endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/concept-endpoints-online?view=azureml-api-2 |
| Use Azure ML vector stores for RAG architectures | https://learn.microsoft.com/en-us/azure/machine-learning/concept-vector-stores?view=azureml-api-2 |

### Limits & Quotas
| Topic | URL |
|-------|-----|
| Check regional availability for standard model deployments | https://learn.microsoft.com/en-us/azure/machine-learning/concept-endpoint-serverless-availability?view=azureml-api-2 |
| Understand soft delete retention for ML workspaces | https://learn.microsoft.com/en-us/azure/machine-learning/concept-soft-delete?view=azureml-api-2 |
| Manage Azure ML resource quotas and limits | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-quotas?view=azureml-api-2 |
| Check Azure ML feature availability by sovereign cloud | https://learn.microsoft.com/en-us/azure/machine-learning/reference-machine-learning-cloud-parity?view=azureml-api-2 |
| Supported VM SKUs for Azure ML managed online endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/reference-managed-online-endpoints-vm-sku-list?view=azureml-api-2 |
| Plan capacity with Azure Machine Learning service limits | https://learn.microsoft.com/en-us/azure/machine-learning/resource-limits-capacity?view=azureml-api-2 |

### Security
| Topic | URL |
|-------|-----|
| Configure customer-managed keys for Azure Machine Learning | https://learn.microsoft.com/en-us/azure/machine-learning/concept-customer-managed-keys?view=azureml-api-2 |
| Understand data encryption for Azure ML compute and storage | https://learn.microsoft.com/en-us/azure/machine-learning/concept-data-encryption?view=azureml-api-2 |
| Understand data handling and privacy for Azure ML Model Catalog | https://learn.microsoft.com/en-us/azure/machine-learning/concept-data-privacy?view=azureml-api-2 |
| Understand auth and RBAC for AML online endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/concept-endpoints-online-auth?view=azureml-api-2 |
| Plan enterprise security and governance for Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/concept-enterprise-security?view=azureml-api-2 |
| Secret injection concepts for AML online endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/concept-secret-injection?view=azureml-api-2 |
| Understand secure network traffic flow for Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/concept-secure-network-traffic-flow?view=azureml-api-2 |
| Configure network isolation for Azure ML online endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/concept-secure-online-endpoint?view=azureml-api-2 |
| Manage vulnerabilities in Azure Machine Learning images | https://learn.microsoft.com/en-us/azure/machine-learning/concept-vulnerability-management?view=azureml-api-2 |
| Configure inbound and outbound traffic for secure Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-access-azureml-behind-firewall?view=azureml-api-2 |
| Securely connect Azure ML managed VNet to on-premises | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-access-on-premises-resources?view=azureml-api-2 |
| Access Azure resources from AML endpoints via managed identity | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-access-resources-from-endpoints-managed-identities?view=azureml-api-2 |
| Assign users and roles for Azure ML data labeling | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-add-users?view=azureml-api-2 |
| Administer data access and authentication for Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-administrate-data-authentication?view=azureml-api-2 |
| Manage Azure ML workspace access with RBAC roles | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-assign-roles?view=azureml-api-2 |
| Authorize access to Azure ML batch endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-authenticate-batch-endpoint?view=azureml-api-2 |
| Configure authentication for Azure ML online endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-authenticate-online-endpoint?view=azureml-api-2 |
| Use built-in Azure Policy to govern AI model deployments | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-built-in-policy-model-deployment?view=azureml-api-2 |
| Rotate Azure ML workspace storage access keys securely | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-change-storage-access-key?view=azureml-api-2 |
| Configure custom DNS for private Azure ML endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-custom-dns?view=azureml-api-2 |
| Create custom Azure Policies to restrict AI model deployments | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-custom-policy-model-deployment?view=azureml-api-2 |
| Use secret injection to access secrets in AML deployments | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-online-endpoint-with-secret-injection?view=azureml-api-2 |
| Disable shared key access for Azure ML workspace storage | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-disable-local-auth-storage?view=azureml-api-2 |
| Configure identity-based service authentication for Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-identity-based-service-authentication?view=azureml-api-2 |
| Enforce Azure ML workspace compliance with Azure Policy | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-integrate-azure-policy?view=azureml-api-2 |
| Use managed virtual networks to isolate Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-managed-network?view=azureml-api-2 |
| Configure Model Catalog access with workspace managed virtual networks | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-network-isolation-model-catalog?view=azureml-api-2 |
| Configure VNet-based network security for Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-network-security-overview?view=azureml-api-2 |
| Configure data exfiltration prevention for Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-prevent-data-loss-exfiltration?view=azureml-api-2 |
| Secure Azure ML batch endpoints with private networks | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-secure-batch-endpoint?view=azureml-api-2 |
| Secure Azure ML online inferencing with VNets | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-secure-inferencing-vnet?view=azureml-api-2 |
| Secure AKS inferencing environments for Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-secure-kubernetes-inferencing-environment?view=azureml-api-2 |
| Configure TLS/SSL for Azure ML Kubernetes endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-secure-kubernetes-online-endpoint?view=azureml-api-2 |
| Secure Azure ML managed online endpoints with private networking | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-secure-online-endpoint?view=azureml-api-2 |
| Secure Azure ML RAG workflows with network isolation | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-secure-rag-workflows?view=azureml-api-2 |
| Secure Azure ML training with virtual networks | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-secure-training-vnet?view=azureml-api-2 |
| Secure Azure ML workspaces with custom VNets | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-secure-workspace-vnet?view=azureml-api-2 |
| Configure RBAC access to Azure ML feature store | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-setup-access-control-feature-store?view=azureml-api-2 |
| Set up authentication to Azure ML workspaces | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-setup-authentication?view=azureml-api-2 |
| Configure customer-managed keys for Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-setup-customer-managed-keys?view=azureml-api-2 |
| Securely use Key Vault secrets in Azure ML runs | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-secrets-in-runs?view=azureml-api-2 |
| Apply built-in Azure Policy definitions for AML | https://learn.microsoft.com/en-us/azure/machine-learning/policy-reference?view=azureml-api-2 |
| Manage credentials with connections in Azure ML prompt flow | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/concept-connections?view=azureml-api-2 |
| Configure network isolation for Prompt flow in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-secure-prompt-flow?view=azureml-api-2 |
| Apply Azure Policy regulatory controls to Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/security-controls-policy?view=azureml-api-2 |
| Create secure Azure ML workspace with managed VNet | https://learn.microsoft.com/en-us/azure/machine-learning/tutorial-create-secure-workspace?view=azureml-api-2 |

### Configuration
| Topic | URL |
|-------|-----|
| Configure AutoML Classification component with ML Tables | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference-v2/classification?view=azureml-api-2 |
| Configure AutoML Forecasting component in designer | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference-v2/forecasting?view=azureml-api-2 |
| Configure AutoML Image Multi-label Classification | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference-v2/image-classification-multilabel?view=azureml-api-2 |
| Configure AutoML Image Classification component | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference-v2/image-classification?view=azureml-api-2 |
| Configure AutoML Image Instance Segmentation component | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference-v2/image-instance-segmentation?view=azureml-api-2 |
| Configure AutoML Image Object Detection component | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference-v2/image-object-detection?view=azureml-api-2 |
| Configure AutoML Regression component with ML Tables | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference-v2/regression?view=azureml-api-2 |
| Configure AutoML Text Multi-label Classification component | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference-v2/text-classification-multilabel?view=azureml-api-2 |
| Configure AutoML Text Classification component | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference-v2/text-classification?view=azureml-api-2 |
| Configure AutoML Text NER component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference-v2/text-ner?view=azureml-api-2 |
| Configure Add Columns component to concatenate datasets | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/add-columns?view=azureml-api-2 |
| Configure Add Rows component to append dataset records | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/add-rows?view=azureml-api-2 |
| Configure Apply Image Transformation in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/apply-image-transformation?view=azureml-api-2 |
| Configure Apply Math Operation component for column calculations | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/apply-math-operation?view=azureml-api-2 |
| Configure Apply SQL Transformation component using SQLite | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/apply-sql-transformation?view=azureml-api-2 |
| Configure Apply Transformation component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/apply-transformation?view=azureml-api-2 |
| Configure Assign Data to Clusters in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/assign-data-to-clusters?view=azureml-api-2 |
| Configure Boosted Decision Tree Regression component (LightGBM) | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/boosted-decision-tree-regression?view=azureml-api-2 |
| Configure Clean Missing Data component for handling nulls | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/clean-missing-data?view=azureml-api-2 |
| Configure Clip Values component to handle outliers | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/clip-values?view=azureml-api-2 |
| Configure and use Azure ML designer algorithm components | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/component-reference?view=azureml-api-2 |
| Configure Convert to CSV component for dataset export | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/convert-to-csv?view=azureml-api-2 |
| Configure Convert to Dataset component for internal format | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/convert-to-dataset?view=azureml-api-2 |
| Configure Convert to Image Directory in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/convert-to-image-directory?view=azureml-api-2 |
| Configure Convert to Indicator Values for categorical encoding | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/convert-to-indicator-values?view=azureml-api-2 |
| Configure Convert Word to Vector component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/convert-word-to-vector?view=azureml-api-2 |
| Configure Create Python Model component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/create-python-model?view=azureml-api-2 |
| Configure Cross Validate Model component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/cross-validate-model?view=azureml-api-2 |
| Configure Decision Forest Regression in Azure ML designer | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/decision-forest-regression?view=azureml-api-2 |
| Configure DenseNet image classification component | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/densenet?view=azureml-api-2 |
| Configure Edit Metadata component to adjust column roles | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/edit-metadata?view=azureml-api-2 |
| Set up Enter Data Manually component for small datasets | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/enter-data-manually?view=azureml-api-2 |
| Configure Evaluate Model component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/evaluate-model?view=azureml-api-2 |
| Configure Evaluate Recommender component for model accuracy | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/evaluate-recommender?view=azureml-api-2 |
| Configure Execute Python Script in Azure ML designer | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/execute-python-script?view=azureml-api-2 |
| Configure Execute R Script component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/execute-r-script?view=azureml-api-2 |
| Configure Export Data component to save pipeline outputs | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/export-data?view=azureml-api-2 |
| Configure Extract N-Gram Features from Text in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/extract-n-gram-features-from-text?view=azureml-api-2 |
| Configure Fast Forest Quantile Regression in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/fast-forest-quantile-regression?view=azureml-api-2 |
| Configure Feature Hashing text component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/feature-hashing?view=azureml-api-2 |
| Configure Filter Based Feature Selection for predictive columns | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/filter-based-feature-selection?view=azureml-api-2 |
| Use graph search query syntax in Azure ML designer | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/graph-search-syntax?view=azureml-api-2 |
| Configure Group Data into Bins component for discretization | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/group-data-into-bins?view=azureml-api-2 |
| Configure Import Data component for Azure ML designer pipelines | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/import-data?view=azureml-api-2 |
| Configure Init Image Transformation in Azure ML designer | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/init-image-transformation?view=azureml-api-2 |
| Configure Join Data component to merge datasets | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/join-data?view=azureml-api-2 |
| Configure K-Means Clustering component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/k-means-clustering?view=azureml-api-2 |
| Configure Latent Dirichlet Allocation component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/latent-dirichlet-allocation?view=azureml-api-2 |
| Configure Linear Regression component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/linear-regression?view=azureml-api-2 |
| Configure Multiclass Boosted Decision Tree in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/multiclass-boosted-decision-tree?view=azureml-api-2 |
| Configure Multiclass Decision Forest in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/multiclass-decision-forest?view=azureml-api-2 |
| Configure Multiclass Logistic Regression in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/multiclass-logistic-regression?view=azureml-api-2 |
| Configure Multiclass Neural Network in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/multiclass-neural-network?view=azureml-api-2 |
| Set up Neural Network Regression in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/neural-network-regression?view=azureml-api-2 |
| Configure Normalize Data component for feature scaling | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/normalize-data?view=azureml-api-2 |
| Configure One-vs-All Multiclass component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/one-vs-all-multiclass?view=azureml-api-2 |
| Configure One-vs-One Multiclass component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/one-vs-one-multiclass?view=azureml-api-2 |
| Configure Partition and Sample component for dataset splitting | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/partition-and-sample?view=azureml-api-2 |
| Configure deprecated PCA-Based Anomaly Detection component | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/pca-based-anomaly-detection?view=azureml-api-2 |
| Configure Permutation Feature Importance component for model insights | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/permutation-feature-importance?view=azureml-api-2 |
| Use Poisson Regression component in Azure ML designer | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/poisson-regression?view=azureml-api-2 |
| Configure Preprocess Text component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/preprocess-text?view=azureml-api-2 |
| Configure Remove Duplicate Rows component for deduplication | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/remove-duplicate-rows?view=azureml-api-2 |
| Configure ResNet image classification in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/resnet?view=azureml-api-2 |
| Configure Score Image Model component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/score-image-model?view=azureml-api-2 |
| Configure Score Model component in Azure ML designer | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/score-model?view=azureml-api-2 |
| Configure Score SVD Recommender for predictions | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/score-svd-recommender?view=azureml-api-2 |
| Configure Score Vowpal Wabbit Model in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/score-vowpal-wabbit-model?view=azureml-api-2 |
| Configure Score Wide & Deep Recommender component | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/score-wide-and-deep-recommender?view=azureml-api-2 |
| Configure Select Columns in Dataset to subset features | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/select-columns-in-dataset?view=azureml-api-2 |
| Configure Select Columns Transform for stable feature sets | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/select-columns-transform?view=azureml-api-2 |
| Configure SMOTE component to oversample minority classes | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/smote?view=azureml-api-2 |
| Configure Split Data component for train-test partitioning | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/split-data?view=azureml-api-2 |
| Configure Split Image Directory component for datasets | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/split-image-directory?view=azureml-api-2 |
| Configure Summarize Data component for descriptive statistics | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/summarize-data?view=azureml-api-2 |
| Configure Train Anomaly Detection Model component | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/train-anomaly-detection-model?view=azureml-api-2 |
| Configure Train Clustering Model component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/train-clustering-model?view=azureml-api-2 |
| Configure Train PyTorch Model component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/train-pytorch-model?view=azureml-api-2 |
| Configure Train SVD Recommender in Azure ML designer | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/train-svd-recommender?view=azureml-api-2 |
| Configure Train Vowpal Wabbit Model in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/train-vowpal-wabbit-model?view=azureml-api-2 |
| Configure Train Wide & Deep Recommender component | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/train-wide-and-deep-recommender?view=azureml-api-2 |
| Configure Tune Model Hyperparameters in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/tune-model-hyperparameters?view=azureml-api-2 |
| Configure Two-Class Averaged Perceptron in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/two-class-averaged-perceptron?view=azureml-api-2 |
| Configure Two-Class Boosted Decision Tree in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/two-class-boosted-decision-tree?view=azureml-api-2 |
| Configure Two-Class Decision Forest in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/two-class-decision-forest?view=azureml-api-2 |
| Configure Two-Class Logistic Regression in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/two-class-logistic-regression?view=azureml-api-2 |
| Configure Two-Class Neural Network in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/two-class-neural-network?view=azureml-api-2 |
| Configure Two-Class SVM component in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/two-class-support-vector-machine?view=azureml-api-2 |
| Configure Web Service Input and Output components | https://learn.microsoft.com/en-us/azure/machine-learning/component-reference/web-service-input-output?view=azureml-api-2 |
| Configure inference data collection for Azure ML endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/concept-data-collection?view=azureml-api-2 |
| Use expressions in Azure ML SDK and CLI v2 jobs | https://learn.microsoft.com/en-us/azure/machine-learning/concept-expressions?view=azureml-api-2 |
| Specify models for Azure ML online deployments | https://learn.microsoft.com/en-us/azure/machine-learning/concept-online-deployment-model-specification?view=azureml-api-2 |
| Use Azure ML prebuilt Docker images for inference | https://learn.microsoft.com/en-us/azure/machine-learning/concept-prebuilt-docker-images-inference?view=azureml-api-2 |
| Configure and use Azure ML Responsible AI dashboard | https://learn.microsoft.com/en-us/azure/machine-learning/concept-responsible-ai-dashboard?view=azureml-api-2 |
| Configure feature retrieval specs for training and inference | https://learn.microsoft.com/en-us/azure/machine-learning/feature-retrieval-concepts?view=azureml-api-2 |
| Configure feature set materialization in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/feature-set-materialization-concepts?view=azureml-api-2 |
| Access Azure cloud storage data during interactive ML development | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-access-data-interactive?view=azureml-api-2 |
| Configure Kubernetes compute targets for Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-attach-kubernetes-anywhere?view=azureml-api-2 |
| Attach AKS or Arc Kubernetes clusters to Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-attach-kubernetes-to-workspace?view=azureml-api-2 |
| Configure Azure AutoML for time-series forecasting | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-auto-train-forecast?view=azureml-api-2 |
| Configure AutoML computer vision training in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-auto-train-image-models?view=azureml-api-2 |
| Configure Azure AutoML for custom NLP training | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-auto-train-nlp-models?view=azureml-api-2 |
| Configure autoscaling for Azure ML online endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-autoscale-endpoints?view=azureml-api-2 |
| Configure custom Azure Container for PyTorch environments | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-azure-container-for-pytorch-environment?view=azureml-api-2 |
| Enable production inference data collection for Azure ML endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-collect-production-data?view=azureml-api-2 |
| Configure Azure ML AutoML training jobs with Python | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-configure-auto-train?view=azureml-api-2 |
| Maintain network isolation with Azure ML v2 API | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-configure-network-isolation-with-v2?view=azureml-api-2 |
| Configure private endpoints for Azure ML workspaces | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-configure-private-link?view=azureml-api-2 |
| Configure Azure ML connections to external data and services | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-connection?view=azureml-api-2 |
| Create and manage Azure ML compute clusters | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-create-attach-compute-cluster?view=azureml-api-2 |
| Configure and manage Azure ML compute in studio | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-create-attach-compute-studio?view=azureml-api-2 |
| Create Azure ML compute instances for development | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-create-compute-instance?view=azureml-api-2 |
| Configure and use vector indexes in Azure ML prompt flow | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-create-vector-index?view=azureml-api-2 |
| Create Azure ML workspaces with ARM templates | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-create-workspace-template?view=azureml-api-2 |
| Customize Azure ML compute instances with startup scripts | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-customize-compute-instance?view=azureml-api-2 |
| Configure and use Azure ML datastores for storage access | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-datastore?view=azureml-api-2 |
| Configure Azure ML Kubernetes extension settings | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-kubernetes-extension?view=azureml-api-2 |
| Enable Azure ML studio access within a virtual network | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-enable-studio-virtual-network?view=azureml-api-2 |
| Import external data into Azure ML (preview) | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-import-data-assets?view=azureml-api-2 |
| Log MLflow models as first-class models in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-log-mlflow-models?view=azureml-api-2 |
| Send Azure ML distributed training logs to Application Insights | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-log-search?view=azureml-api-2 |
| Configure model interpretability in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-machine-learning-interpretability?view=azureml-api-2 |
| Manage Azure ML compute instances and lifecycle | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-compute-instance?view=azureml-api-2 |
| Configure Azure ML environments with CLI and SDK | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-environments-v2?view=azureml-api-2 |
| Create Azure ML hub workspaces with Bicep templates | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-hub-workspace-template?view=azureml-api-2 |
| Configure and manage Azure ML Kubernetes instance types | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-kubernetes-instance-types?view=azureml-api-2 |
| Configure Azure ML deployment templates for models | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-models-deployment-templates?view=azureml-api-2 |
| Manage Azure ML model registry using MLflow | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-models-mlflow?view=azureml-api-2 |
| Register and manage models with Azure ML CLI and SDK | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-models?view=azureml-api-2 |
| Create and manage Azure ML registries | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-registries?view=azureml-api-2 |
| Attach and manage Synapse Spark pools in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-synapse-spark-pool?view=azureml-api-2 |
| Provision Azure ML workspaces using Terraform | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-workspace-terraform?view=azureml-api-2 |
| Define and use MLTable schemas in Azure Machine Learning | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-mltable?view=azureml-api-2 |
| Collect and monitor Kubernetes endpoint inference logs | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-monitor-kubernetes-online-enpoint-inference-server-log?view=azureml-api-2 |
| Configure Azure ML model performance monitoring in production | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-monitor-model-performance?view=azureml-api-2 |
| Configure monitoring and logging for Azure ML online endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-monitor-online-endpoints?view=azureml-api-2 |
| Use R and RStudio on Azure ML compute instances | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-r-interactive-development?view=azureml-api-2 |
| Configure network isolation for Azure ML registries | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-registry-network-isolation?view=azureml-api-2 |
| Use Responsible AI dashboard tools in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-responsible-ai-dashboard?view=azureml-api-2 |
| Generate Responsible AI insights in Azure ML studio | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-responsible-ai-insights-ui?view=azureml-api-2 |
| Configure and export Responsible AI scorecards in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-responsible-ai-scorecard?view=azureml-api-2 |
| Schedule recurring data imports in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-schedule-data-import?view=azureml-api-2 |
| Share models and components across Azure ML workspaces | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-share-models-pipelines-across-workspaces-with-registries?view=azureml-api-2 |
| Query and compare MLflow experiments and runs in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-track-experiments-mlflow?view=azureml-api-2 |
| Submit MLflow Projects training jobs to Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-train-mlflow-projects?view=azureml-api-2 |
| Configure and submit Azure ML training jobs | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-train-model?view=azureml-api-2 |
| Configure and submit Azure ML training jobs | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-train-model?view=azureml-api-2 |
| Configure Azure ML hyperparameter sweep jobs | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-tune-hyperparameters?view=azureml-api-2 |
| Configure low-priority and Spot VMs for Azure ML batch | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-low-priority-batch?view=azureml-api-2 |
| Use MLflow to track Azure ML experiments and runs | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-mlflow-cli-runs?view=azureml-api-2 |
| Configure MLflow tracking with Azure Machine Learning workspaces | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-mlflow-configure-tracking?view=azureml-api-2 |
| Configure and run parallel jobs in Azure ML pipelines | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-parallel-job-in-pipeline?view=azureml-api-2 |
| Run training jobs on Azure ML serverless compute | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-serverless-compute?view=azureml-api-2 |
| Configure hyperparameter sweep in Azure ML pipelines | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-sweep-in-pipeline?view=azureml-api-2 |
| View and tag costs for Azure ML managed online endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-view-online-endpoints-costs?view=azureml-api-2 |
| Configure VS Code remote sessions to Azure ML compute | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-work-in-vs-code-remote?view=azureml-api-2 |
| Configure serverless Spark compute for Azure ML notebooks | https://learn.microsoft.com/en-us/azure/machine-learning/interactive-data-wrangling-with-apache-spark-azure-ml?view=azureml-api-2 |
| Reference monitoring metrics for Azure Machine Learning | https://learn.microsoft.com/en-us/azure/machine-learning/monitor-azure-machine-learning-reference?view=azureml-api-2 |
| Run batch evaluations for Prompt Flow at scale | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-bulk-test-evaluate-flow?view=azureml-api-2 |
| Customize compute session base images for Azure ML prompt flow | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-customize-session-base-image?view=azureml-api-2 |
| Create and customize evaluation flows and metrics | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-develop-an-evaluation-flow?view=azureml-api-2 |
| Configure streaming mode for prompt flow endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-enable-streaming-mode?view=azureml-api-2 |
| Configure tracing and feedback for prompt flow deployments | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-enable-trace-feedback-for-deployment?view=azureml-api-2 |
| Configure and manage Prompt Flow compute sessions | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-manage-compute-session?view=azureml-api-2 |
| Configure monitoring for generative AI endpoints in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-monitor-generative-ai-applications?view=azureml-api-2 |
| Configure Automated ML forecasting jobs via YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-automated-ml-forecasting?view=azureml-api-2 |
| Author AutoML image classification jobs in YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-automl-images-cli-classification?view=azureml-api-2 |
| Define AutoML image instance segmentation YAML jobs | https://learn.microsoft.com/en-us/azure/machine-learning/reference-automl-images-cli-instance-segmentation?view=azureml-api-2 |
| Configure AutoML image multilabel classification YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-automl-images-cli-multilabel-classification?view=azureml-api-2 |
| Author AutoML image object detection YAML jobs | https://learn.microsoft.com/en-us/azure/machine-learning/reference-automl-images-cli-object-detection?view=azureml-api-2 |
| Configure AutoML vision hyperparameters in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-automl-images-hyperparameters?view=azureml-api-2 |
| Format JSONL data for AutoML computer vision | https://learn.microsoft.com/en-us/azure/machine-learning/reference-automl-images-schema?view=azureml-api-2 |
| Configure AutoML multilabel text classification YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-automl-nlp-cli-multilabel-classification?view=azureml-api-2 |
| Author AutoML NLP NER jobs using YAML schema | https://learn.microsoft.com/en-us/azure/machine-learning/reference-automl-nlp-cli-ner?view=azureml-api-2 |
| Define AutoML text classification jobs with YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-automl-nlp-cli-text-classification?view=azureml-api-2 |
| Reference configuration for Kubernetes with Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-kubernetes?view=azureml-api-2 |
| Define command components via Azure ML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-component-command?view=azureml-api-2 |
| Author pipeline components using Azure ML YAML schema | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-component-pipeline?view=azureml-api-2 |
| Configure Spark components in Azure ML YAML schema | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-component-spark?view=azureml-api-2 |
| Configure AmlCompute clusters via YAML in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-compute-aml?view=azureml-api-2 |
| Define Azure ML compute instances with YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-compute-instance?view=azureml-api-2 |
| Configure attached Kubernetes clusters in Azure ML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-compute-kubernetes?view=azureml-api-2 |
| Attach and configure VMs via Azure ML YAML schema | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-compute-vm?view=azureml-api-2 |
| Configure AI Content Safety connections in AML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-connection-ai-content-safety?view=azureml-api-2 |
| Author AI Search connection YAML for AML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-connection-ai-search?view=azureml-api-2 |
| Configure Foundry Tools connections with Azure ML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-connection-ai-services?view=azureml-api-2 |
| Define API key connections via AML YAML schema | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-connection-api-key?view=azureml-api-2 |
| Define Azure OpenAI connections via AML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-connection-azure-openai?view=azureml-api-2 |
| Define blob datastore connections in AML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-connection-blob?view=azureml-api-2 |
| Configure Azure Container Registry connections in AML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-connection-container-registry?view=azureml-api-2 |
| Author custom key connections in Azure ML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-connection-custom-key?view=azureml-api-2 |
| Configure Data Lake Gen2 connections via AML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-connection-data-lake?view=azureml-api-2 |
| Configure Git repository connections in AML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-connection-git?view=azureml-api-2 |
| Set up OneLake connections using AML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-connection-onelake?view=azureml-api-2 |
| Configure OpenAI service connections in AML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-connection-openai?view=azureml-api-2 |
| Set up Python feed connections using AML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-connection-python-feed?view=azureml-api-2 |
| Define Serp connections via Azure ML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-connection-serp?view=azureml-api-2 |
| Author serverless connection YAML for Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-connection-serverless?view=azureml-api-2 |
| Configure AI Speech Services connections in AML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-connection-speech?view=azureml-api-2 |
| Understand core Azure ML CLI v2 YAML syntax | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-core-syntax?view=azureml-api-2 |
| Reference schema for Azure ML data YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-data?view=azureml-api-2 |
| Define Azure Blob datastores via YAML in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-datastore-blob?view=azureml-api-2 |
| Author Azure Data Lake Gen1 datastore YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-datastore-data-lake-gen1?view=azureml-api-2 |
| Configure Azure Data Lake Gen2 datastores in YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-datastore-data-lake-gen2?view=azureml-api-2 |
| Configure Azure Files datastores using YAML schema | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-datastore-files?view=azureml-api-2 |
| Author batch deployment YAML for Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-deployment-batch?view=azureml-api-2 |
| Define Kubernetes online deployments in Azure ML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-deployment-kubernetes-online?view=azureml-api-2 |
| Configure managed online deployments via Azure ML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-deployment-managed-online?view=azureml-api-2 |
| Configure Azure ML CLI v2 deployment template YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-deployment-template?view=azureml-api-2 |
| Author batch endpoint YAML for Azure ML CLI v2 | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-endpoint-batch?view=azureml-api-2 |
| Configure Azure ML online endpoints with YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-endpoint-online?view=azureml-api-2 |
| Reference schema for Azure ML environment YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-environment?view=azureml-api-2 |
| Author feature entity definitions via Azure ML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-feature-entity?view=azureml-api-2 |
| Create feature retrieval specs with Azure ML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-feature-retrieval-spec?view=azureml-api-2 |
| Configure feature sets in Azure ML YAML schema | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-feature-set?view=azureml-api-2 |
| Define feature stores in Azure ML using YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-feature-store?view=azureml-api-2 |
| Define feature set specifications using YAML schema | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-featureset-spec?view=azureml-api-2 |
| Configure Azure ML CLI v2 command job YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-job-command?view=azureml-api-2 |
| Configure Azure ML parallel job YAML schema | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-job-parallel?view=azureml-api-2 |
| Configure Azure ML pipeline jobs using YAML schema | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-job-pipeline?view=azureml-api-2 |
| Configure Spark jobs in Azure ML with YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-job-spark?view=azureml-api-2 |
| Define sweep (hyperparameter) jobs with Azure ML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-job-sweep?view=azureml-api-2 |
| Reference schema for Azure ML MLTable YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-mltable?view=azureml-api-2 |
| Define Azure ML models with CLI v2 YAML schema | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-model?view=azureml-api-2 |
| Create model monitoring schedules with Azure ML YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-monitor?view=azureml-api-2 |
| Navigate Azure ML CLI v2 YAML schema references | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-overview?view=azureml-api-2 |
| Define Azure ML registries using CLI v2 YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-registry?view=azureml-api-2 |
| Author data import schedule YAML for Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-schedule-data-import?view=azureml-api-2 |
| Configure Azure ML job schedules with YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-schedule?view=azureml-api-2 |
| Reference schema for Azure ML workspace YAML | https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-workspace?view=azureml-api-2 |

### Integrations & Coding Patterns
| Topic | URL |
|-------|-----|
| Copy Fabric OneLake tables into Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/create-datastore-with-user-interface?view=azureml-api-2 |
| Configure input data sources for AML batch endpoint jobs | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-access-data-batch-endpoints-jobs?view=azureml-api-2 |
| Run MLflow models in Azure ML Spark jobs | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-mlflow-model-spark-jobs?view=azureml-api-2 |
| Use Azure ML REST API for online deployments | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-with-rest?view=azureml-api-2 |
| Run local ONNX inference for Azure AutoML image models | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-inference-onnx-automl-image-models?view=azureml-api-2 |
| Use Azure ML inference HTTP server for local debugging | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-inference-server-http?view=azureml-api-2 |
| Log metrics and artifacts with MLflow in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-log-view-metrics?view=azureml-api-2 |
| Manage Azure ML resources using REST APIs | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-rest?view=azureml-api-2 |
| Securely integrate Azure Synapse with Azure ML via VNets | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-private-endpoint-integration-synapse?view=azureml-api-2 |
| Read and write data in Azure ML jobs (v2 SDK) | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-read-write-data-v2?view=azureml-api-2 |
| Generate Responsible AI dashboards with Azure ML SDK | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-responsible-ai-insights-sdk-cli?view=azureml-api-2 |
| Attach secured Azure Databricks to Azure ML via private endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-securely-attach-databricks?view=azureml-api-2 |
| Submit standalone and pipeline Spark jobs in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-submit-spark-jobs?view=azureml-api-2 |
| Train PyTorch models using Azure ML SDK v2 | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-train-pytorch?view=azureml-api-2 |
| Use Azure AutoML ONNX models with ML.NET in .NET apps | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-automl-onnx-model-dotnet?view=azureml-api-2 |
| Invoke Azure ML batch endpoints from Azure Data Factory | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-batch-azure-data-factory?view=azureml-api-2 |
| Integrate Fabric with Azure ML batch endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-batch-fabric?view=azureml-api-2 |
| Trigger Azure ML batch endpoints from Event Grid | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-event-grid-batch?view=azureml-api-2 |
| Integrate Azure ML events with Event Grid workflows | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-event-grid?view=azureml-api-2 |
| Integrate Azure Databricks MLflow tracking with Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-mlflow-azure-databricks?view=azureml-api-2 |
| Configure MLflow tracking from Azure Synapse to Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-mlflow-azure-synapse?view=azureml-api-2 |
| Set up RAG prompt flow samples in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-retrieval-augmented-generation?view=azureml-api-2 |
| Create and use custom tool packages in prompt flow | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-custom-tool-package-creation-and-usage?view=azureml-api-2 |
| Integrate LangChain workflows into Azure ML prompt flow | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-integrate-with-langchain?view=azureml-api-2 |
| Rebuild Prompt Flow workflows using Microsoft Agent Framework | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-migrate-prompt-flow-to-agent-framework?view=azureml-api-2 |
| Process and use images within Azure ML prompt flows | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-process-image?view=azureml-api-2 |
| Use Azure OpenAI GPT-4 Turbo with Vision tool in prompt flow | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/tools-reference/azure-open-ai-gpt-4v-tool?view=azureml-api-2 |
| Use Content Safety text tool in prompt flow | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/tools-reference/content-safety-text-tool?view=azureml-api-2 |
| Configure the embedding tool for prompt flow RAG | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/tools-reference/embedding-tool?view=azureml-api-2 |
| Configure Index Lookup tool for vector search in prompt flow | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/tools-reference/index-lookup-tool?view=azureml-api-2 |
| Configure and use the LLM tool in prompt flow | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/tools-reference/llm-tool?view=azureml-api-2 |
| Configure Open Model LLM tool for open-source models | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/tools-reference/open-model-llm-tool?view=azureml-api-2 |
| Integrate OpenAI GPT-4V vision model via prompt flow tool | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/tools-reference/openai-gpt-4v-tool?view=azureml-api-2 |
| Use the prompt tool templates in prompt flow | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/tools-reference/prompt-tool?view=azureml-api-2 |
| Build and configure Python tools in prompt flow | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/tools-reference/python-tool?view=azureml-api-2 |
| Set up the rerank tool for prompt flow search | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/tools-reference/rerank-tool?view=azureml-api-2 |
| Integrate SerpAPI search results via prompt flow tool | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/tools-reference/serp-api-tool?view=azureml-api-2 |
| Quickstart: Configure Spark jobs in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/quickstart-spark-jobs?view=azureml-api-2 |
| Map Azure ML v1 logging APIs to MLflow tracking | https://learn.microsoft.com/en-us/azure/machine-learning/reference-migrate-sdk-v1-mlflow-tracking?view=azureml-api-2 |

### Deployment
| Topic | URL |
|-------|-----|
| Consume Azure ML standard deployments across workspaces | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-connect-models-serverless?view=azureml-api-2 |
| Deploy AutoML models to AML online endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-automl-endpoint?view=azureml-api-2 |
| Deploy custom-container models to AML online endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-custom-container?view=azureml-api-2 |
| Progressively deploy MLflow models to Azure ML online endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-mlflow-models-online-progressive?view=azureml-api-2 |
| Deploy MLflow models to Azure ML endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-mlflow-models?view=azureml-api-2 |
| Customize batch deployment outputs in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-model-custom-output?view=azureml-api-2 |
| Deploy Azure ML registry models using deployment templates | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-models-deployment-template?view=azureml-api-2 |
| Deploy Hugging Face models to Azure ML endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-models-from-huggingface?view=azureml-api-2 |
| Deploy catalog models as standard serverless endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-models-serverless?view=azureml-api-2 |
| Deploy ONNX models with Triton on Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-with-triton?view=azureml-api-2 |
| Create GitHub Actions CI/CD for Azure ML training | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-github-actions-machine-learning?view=azureml-api-2 |
| Deploy image-processing models with AML batch endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-image-processing-batch?view=azureml-api-2 |
| Deploy MLflow models to Azure ML batch endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-mlflow-batch?view=azureml-api-2 |
| Run Azure ML RAG prompt flows locally with VS Code | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-retrieval-augmented-generation-cloud-to-local?view=azureml-api-2 |
| Perform safe blue-green rollouts for Azure ML online endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-safely-rollout-online-endpoints?view=azureml-api-2 |
| Set up end-to-end MLOps with Azure DevOps and Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-setup-mlops-azureml?view=azureml-api-2 |
| Set up end-to-end MLOps with GitHub and Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-setup-mlops-github-azure-ml?view=azureml-api-2 |
| Run Azure OpenAI embeddings via AML batch endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-batch-model-openai-embeddings?view=azureml-api-2 |
| Deploy and invoke pipelines via AML batch endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-batch-pipeline-deployments?view=azureml-api-2 |
| Convert existing AML pipeline jobs to batch endpoint deployments | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-batch-pipeline-from-job?view=azureml-api-2 |
| Operationalize scoring pipelines on AML batch endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-batch-scoring-pipeline?view=azureml-api-2 |
| Operationalize training pipelines on AML batch endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-batch-training-pipeline?view=azureml-api-2 |
| Build RAG pipelines with Azure ML and prompt flow | https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-pipelines-prompt-flow?view=azureml-api-2 |
| Set up and deploy prompt flow in Azure ML | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/get-started-prompt-flow?view=azureml-api-2 |
| Deploy migrated Agent Framework workflows to Azure | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-deploy-migrated-agent-framework-workflow?view=azureml-api-2 |
| Deploy prompt flow to Azure ML online endpoints | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-deploy-to-code?view=azureml-api-2 |
| Set up GenAIOps pipelines with prompt flow and Azure DevOps | https://learn.microsoft.com/en-us/azure/machine-learning/prompt-flow/how-to-end-to-end-azure-devops-with-prompt-flow?view=azureml-api-2 |