#!/usr/bin/env python3
"""
Agent Planner - Multi-Agent System Architecture Designer

Given a system description (goal, tasks, constraints, team size), designs a multi-agent
architecture: defines agent roles, responsibilities, capabilities needed, communication
topology, tool requirements. Generates architecture diagram (Mermaid).

Input: system requirements JSON
Output: agent architecture + role definitions + Mermaid diagram + implementation roadmap
"""

import json
import argparse
import sys
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum


class AgentArchitecturePattern(Enum):
    """Supported agent architecture patterns"""
    SINGLE_AGENT = "single_agent"
    SUPERVISOR = "supervisor"
    SWARM = "swarm"
    HIERARCHICAL = "hierarchical"
    PIPELINE = "pipeline"


class CommunicationPattern(Enum):
    """Agent communication patterns"""
    DIRECT_MESSAGE = "direct_message"
    SHARED_STATE = "shared_state"
    EVENT_DRIVEN = "event_driven"
    MESSAGE_QUEUE = "message_queue"


class AgentRole(Enum):
    """Standard agent role archetypes"""
    COORDINATOR = "coordinator"
    SPECIALIST = "specialist"
    INTERFACE = "interface"
    MONITOR = "monitor"


@dataclass
class Tool:
    """Tool definition for agents"""
    name: str
    description: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    capabilities: List[str]
    reliability: str = "high"  # high, medium, low
    latency: str = "low"       # low, medium, high


@dataclass
class AgentDefinition:
    """Complete agent definition"""
    name: str
    role: str
    archetype: AgentRole
    responsibilities: List[str]
    capabilities: List[str]
    tools: List[Tool]
    communication_interfaces: List[str]
    constraints: Dict[str, Any]
    success_criteria: List[str]
    dependencies: List[str] = None


@dataclass
class CommunicationLink:
    """Communication link between agents"""
    from_agent: str
    to_agent: str
    pattern: CommunicationPattern
    data_format: str
    frequency: str
    criticality: str


@dataclass
class SystemRequirements:
    """Input system requirements"""
    goal: str
    description: str
    tasks: List[str]
    constraints: Dict[str, Any]
    team_size: int
    performance_requirements: Dict[str, Any]
    safety_requirements: List[str]
    integration_requirements: List[str]
    scale_requirements: Dict[str, Any]


@dataclass
class ArchitectureDesign:
    """Complete architecture design output"""
    pattern: AgentArchitecturePattern
    agents: List[AgentDefinition]
    communication_topology: List[CommunicationLink]
    shared_resources: List[Dict[str, Any]]
    guardrails: List[Dict[str, Any]]
    scaling_strategy: Dict[str, Any]
    failure_handling: Dict[str, Any]


class AgentPlanner:
    """Multi-agent system architecture planner"""
    
    def __init__(self):
        self.common_tools = self._define_common_tools()
        self.pattern_heuristics = self._define_pattern_heuristics()
    
    def _define_common_tools(self) -> Dict[str, Tool]:
        """Define commonly used tools across agents"""
        return {
            "web_search": Tool(
                name="web_search",
                description="Search the web for information",
                input_schema={"type": "object", "properties": {"query": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"results": {"type": "array"}}},
                capabilities=["research", "information_gathering"],
                reliability="high",
                latency="medium"
            ),
            "code_executor": Tool(
                name="code_executor",
                description="Execute code in various languages",
                input_schema={"type": "object", "properties": {"language": {"type": "string"}, "code": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"result": {"type": "string"}, "error": {"type": "string"}}},
                capabilities=["code_execution", "testing", "automation"],
                reliability="high",
                latency="low"
            ),
            "file_manager": Tool(
                name="file_manager",
                description="Manage files and directories",
                input_schema={"type": "object", "properties": {"action": {"type": "string"}, "path": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"success": {"type": "boolean"}, "content": {"type": "string"}}},
                capabilities=["file_operations", "data_management"],
                reliability="high",
                latency="low"
            ),
            "data_analyzer": Tool(
                name="data_analyzer",
                description="Analyze and process data",
                input_schema={"type": "object", "properties": {"data": {"type": "object"}, "analysis_type": {"type": "string"}}},
                output_schema={"type": "object", "properties": {"insights": {"type": "array"}, "metrics": {"type": "object"}}},
                capabilities=["data_analysis", "statistics", "visualization"],
                reliability="high",
                latency="medium"
            ),
            "api_client": Tool(
                name="api_client",
                description="Make API calls to external services",
                input_schema={"type": "object", "properties": {"url": {"type": "string"}, "method": {"type": "string"}, "data": {"type": "object"}}},
                output_schema={"type": "object", "properties": {"response": {"type": "object"}, "status": {"type": "integer"}}},
                capabilities=["integration", "external_services"],
                reliability="medium",
                latency="medium"
            )
        }
    
    def _define_pattern_heuristics(self) -> Dict[AgentArchitecturePattern, Dict[str, Any]]:
        """Define heuristics for selecting architecture patterns"""
        return {
            AgentArchitecturePattern.SINGLE_AGENT: {
                "team_size_range": (1, 1),
                "task_complexity": "simple",
                "coordination_overhead": "none",
                "suitable_for": ["simple tasks", "prototyping", "single domain"],
                "scaling_limit": "low"
            },
            AgentArchitecturePattern.SUPERVISOR: {
                "team_size_range": (2, 8),
                "task_complexity": "medium",
                "coordination_overhead": "low",
                "suitable_for": ["hierarchical tasks", "clear delegation", "quality control"],
                "scaling_limit": "medium"
            },
            AgentArchitecturePattern.SWARM: {
                "team_size_range": (3, 20),
                "task_complexity": "high",
                "coordination_overhead": "high",
                "suitable_for": ["parallel processing", "distributed problem solving", "fault tolerance"],
                "scaling_limit": "high"
            },
            AgentArchitecturePattern.HIERARCHICAL: {
                "team_size_range": (5, 50),
                "task_complexity": "very high",
                "coordination_overhead": "medium",
                "suitable_for": ["large organizations", "complex workflows", "enterprise systems"],
                "scaling_limit": "very high"
            },
            AgentArchitecturePattern.PIPELINE: {
                "team_size_range": (3, 15),
                "task_complexity": "medium",
                "coordination_overhead": "low",
                "suitable_for": ["sequential processing", "data pipelines", "assembly line tasks"],
                "scaling_limit": "medium"
            }
        }
    
    def select_architecture_pattern(self, requirements: SystemRequirements) -> AgentArchitecturePattern:
        """Select the most appropriate architecture pattern based on requirements"""
        team_size = requirements.team_size
        task_count = len(requirements.tasks)
        performance_reqs = requirements.performance_requirements
        
        # Score each pattern based on requirements
        pattern_scores = {}
        
        for pattern, heuristics in self.pattern_heuristics.items():
            score = 0
            
            # Team size fit
            min_size, max_size = heuristics["team_size_range"]
            if min_size <= team_size <= max_size:
                score += 3
            elif abs(team_size - min_size) <= 2 or abs(team_size - max_size) <= 2:
                score += 1
            
            # Task complexity assessment
            complexity_indicators = [
                "parallel" in requirements.description.lower(),
                "sequential" in requirements.description.lower(),
                "hierarchical" in requirements.description.lower(),
                "distributed" in requirements.description.lower(),
                task_count > 5,
                len(requirements.constraints) > 3
            ]
            
            complexity_score = sum(complexity_indicators)
            
            if pattern == AgentArchitecturePattern.SINGLE_AGENT and complexity_score <= 2:
                score += 2
            elif pattern == AgentArchitecturePattern.SUPERVISOR and 2 <= complexity_score <= 4:
                score += 2
            elif pattern == AgentArchitecturePattern.PIPELINE and "sequential" in requirements.description.lower():
                score += 3
            elif pattern == AgentArchitecturePattern.SWARM and "parallel" in requirements.description.lower():
                score += 3
            elif pattern == AgentArchitecturePattern.HIERARCHICAL and complexity_score >= 4:
                score += 2
            
            # Performance requirements
            if performance_reqs.get("high_throughput", False) and pattern in [AgentArchitecturePattern.SWARM, AgentArchitecturePattern.PIPELINE]:
                score += 2
            if performance_reqs.get("fault_tolerance", False) and pattern == AgentArchitecturePattern.SWARM:
                score += 2
            if performance_reqs.get("low_latency", False) and pattern in [AgentArchitecturePattern.SINGLE_AGENT, AgentArchitecturePattern.PIPELINE]:
                score += 1
            
            pattern_scores[pattern] = score
        
        # Select the highest scoring pattern
        best_pattern = max(pattern_scores.items(), key=lambda x: x[1])[0]
        return best_pattern
    
    def design_agents(self, requirements: SystemRequirements, pattern: AgentArchitecturePattern) -> List[AgentDefinition]:
        """Design individual agents based on requirements and architecture pattern"""
        agents = []
        
        if pattern == AgentArchitecturePattern.SINGLE_AGENT:
            agents = self._design_single_agent(requirements)
        elif pattern == AgentArchitecturePattern.SUPERVISOR:
            agents = self._design_supervisor_agents(requirements)
        elif pattern == AgentArchitecturePattern.SWARM:
            agents = self._design_swarm_agents(requirements)
        elif pattern == AgentArchitecturePattern.HIERARCHICAL:
            agents = self._design_hierarchical_agents(requirements)
        elif pattern == AgentArchitecturePattern.PIPELINE:
            agents = self._design_pipeline_agents(requirements)
        
        return agents
    
    def _design_single_agent(self, requirements: SystemRequirements) -> List[AgentDefinition]:
        """Design a single general-purpose agent"""
        all_tools = list(self.common_tools.values())
        
        agent = AgentDefinition(
            name="universal_agent",
            role="Universal Task Handler",
            archetype=AgentRole.SPECIALIST,
            responsibilities=requirements.tasks,
            capabilities=["general_purpose", "multi_domain", "adaptable"],
            tools=all_tools,
            communication_interfaces=["direct_user_interface"],
            constraints={
                "max_concurrent_tasks": 1,
                "memory_limit": "high",
                "response_time": "fast"
            },
            success_criteria=["complete all assigned tasks", "maintain quality standards", "respond within time limits"],
            dependencies=[]
        )
        
        return [agent]
    
    def _design_supervisor_agents(self, requirements: SystemRequirements) -> List[AgentDefinition]:
        """Design supervisor pattern agents"""
        agents = []
        
        # Create supervisor agent
        supervisor = AgentDefinition(
            name="supervisor_agent",
            role="Task Coordinator and Quality Controller",
            archetype=AgentRole.COORDINATOR,
            responsibilities=[
                "task_decomposition",
                "delegation",
                "progress_monitoring",
                "quality_assurance",
                "result_aggregation"
            ],
            capabilities=["planning", "coordination", "evaluation", "decision_making"],
            tools=[self.common_tools["file_manager"], self.common_tools["data_analyzer"]],
            communication_interfaces=["user_interface", "agent_messaging"],
            constraints={
                "max_concurrent_supervisions": 5,
                "decision_timeout": "30s"
            },
            success_criteria=["successful task completion", "optimal resource utilization", "quality standards met"],
            dependencies=[]
        )
        agents.append(supervisor)
        
        # Create specialist agents based on task domains
        task_domains = self._identify_task_domains(requirements.tasks)
        for i, domain in enumerate(task_domains[:requirements.team_size - 1]):
            specialist = AgentDefinition(
                name=f"{domain}_specialist",
                role=f"{domain.title()} Specialist",
                archetype=AgentRole.SPECIALIST,
                responsibilities=[task for task in requirements.tasks if domain in task.lower()],
                capabilities=[f"{domain}_expertise", "specialized_tools", "domain_knowledge"],
                tools=self._select_tools_for_domain(domain),
                communication_interfaces=["supervisor_messaging"],
                constraints={
                    "domain_scope": domain,
                    "task_queue_size": 10
                },
                success_criteria=[f"excel in {domain} tasks", "maintain domain expertise", "provide quality output"],
                dependencies=["supervisor_agent"]
            )
            agents.append(specialist)
        
        return agents
    
    def _design_swarm_agents(self, requirements: SystemRequirements) -> List[AgentDefinition]:
        """Design swarm pattern agents"""
        agents = []
        
        # Create peer agents with overlapping capabilities
        agent_count = min(requirements.team_size, 10)  # Reasonable swarm size
        base_capabilities = ["collaboration", "consensus", "adaptation", "peer_communication"]
        
        for i in range(agent_count):
            agent = AgentDefinition(
                name=f"swarm_agent_{i+1}",
                role=f"Collaborative Worker #{i+1}",
                archetype=AgentRole.SPECIALIST,
                responsibilities=requirements.tasks,  # All agents can handle all tasks
                capabilities=base_capabilities + [f"specialization_{i%3}"],  # Some specialization
                tools=list(self.common_tools.values()),
                communication_interfaces=["peer_messaging", "broadcast", "consensus_protocol"],
                constraints={
                    "peer_discovery_timeout": "10s",
                    "consensus_threshold": 0.6,
                    "max_retries": 3
                },
                success_criteria=["contribute to group goals", "maintain peer relationships", "adapt to failures"],
                dependencies=[f"swarm_agent_{j+1}" for j in range(agent_count) if j != i]
            )
            agents.append(agent)
        
        return agents
    
    def _design_hierarchical_agents(self, requirements: SystemRequirements) -> List[AgentDefinition]:
        """Design hierarchical pattern agents"""
        agents = []
        
        # Create management hierarchy
        levels = min(3, requirements.team_size // 3)  # Reasonable hierarchy depth
        agents_per_level = requirements.team_size // levels
        
        # Top level manager
        manager = AgentDefinition(
            name="executive_manager",
            role="Executive Manager",
            archetype=AgentRole.COORDINATOR,
            responsibilities=["strategic_planning", "resource_allocation", "performance_monitoring"],
            capabilities=["leadership", "strategy", "resource_management", "oversight"],
            tools=[self.common_tools["data_analyzer"], self.common_tools["file_manager"]],
            communication_interfaces=["executive_dashboard", "management_messaging"],
            constraints={"management_span": 5, "decision_authority": "high"},
            success_criteria=["achieve system goals", "optimize resource usage", "maintain quality"],
            dependencies=[]
        )
        agents.append(manager)
        
        # Middle managers
        for i in range(agents_per_level - 1):
            middle_manager = AgentDefinition(
                name=f"team_manager_{i+1}",
                role=f"Team Manager #{i+1}",
                archetype=AgentRole.COORDINATOR,
                responsibilities=["team_coordination", "task_distribution", "progress_tracking"],
                capabilities=["team_management", "coordination", "reporting"],
                tools=[self.common_tools["file_manager"]],
                communication_interfaces=["management_messaging", "team_messaging"],
                constraints={"team_size": 3, "reporting_frequency": "hourly"},
                success_criteria=["team performance", "task completion", "team satisfaction"],
                dependencies=["executive_manager"]
            )
            agents.append(middle_manager)
        
        # Workers
        remaining_agents = requirements.team_size - len(agents)
        for i in range(remaining_agents):
            worker = AgentDefinition(
                name=f"worker_agent_{i+1}",
                role=f"Task Worker #{i+1}",
                archetype=AgentRole.SPECIALIST,
                responsibilities=["task_execution", "result_delivery", "status_reporting"],
                capabilities=["task_execution", "specialized_skills", "reliability"],
                tools=self._select_diverse_tools(),
                communication_interfaces=["team_messaging"],
                constraints={"task_focus": "single", "reporting_interval": "30min"},
                success_criteria=["complete assigned tasks", "maintain quality", "meet deadlines"],
                dependencies=[f"team_manager_{(i // 3) + 1}"]
            )
            agents.append(worker)
        
        return agents
    
    def _design_pipeline_agents(self, requirements: SystemRequirements) -> List[AgentDefinition]:
        """Design pipeline pattern agents"""
        agents = []
        
        # Create sequential processing stages
        pipeline_stages = self._identify_pipeline_stages(requirements.tasks)
        
        for i, stage in enumerate(pipeline_stages):
            agent = AgentDefinition(
                name=f"pipeline_stage_{i+1}_{stage}",
                role=f"Pipeline Stage {i+1}: {stage.title()}",
                archetype=AgentRole.SPECIALIST,
                responsibilities=[f"process_{stage}", f"validate_{stage}_output", "handoff_to_next_stage"],
                capabilities=[f"{stage}_processing", "quality_control", "data_transformation"],
                tools=self._select_tools_for_stage(stage),
                communication_interfaces=["pipeline_queue", "stage_messaging"],
                constraints={
                    "processing_order": i + 1,
                    "batch_size": 10,
                    "stage_timeout": "5min"
                },
                success_criteria=[f"successfully process {stage}", "maintain data integrity", "meet throughput targets"],
                dependencies=[f"pipeline_stage_{i}_{pipeline_stages[i-1]}"] if i > 0 else []
            )
            agents.append(agent)
        
        return agents
    
    def _identify_task_domains(self, tasks: List[str]) -> List[str]:
        """Identify distinct domains from task list"""
        domains = []
        domain_keywords = {
            "research": ["research", "search", "find", "investigate", "analyze"],
            "development": ["code", "build", "develop", "implement", "program"],
            "data": ["data", "process", "analyze", "calculate", "compute"],
            "communication": ["write", "send", "message", "communicate", "report"],
            "file": ["file", "document", "save", "load", "manage"]
        }
        
        for domain, keywords in domain_keywords.items():
            if any(keyword in " ".join(tasks).lower() for keyword in keywords):
                domains.append(domain)
        
        return domains[:5]  # Limit to 5 domains
    
    def _identify_pipeline_stages(self, tasks: List[str]) -> List[str]:
        """Identify pipeline stages from task list"""
        # Common pipeline patterns
        common_stages = ["input", "process", "transform", "validate", "output"]
        
        # Try to infer stages from tasks
        stages = []
        task_text = " ".join(tasks).lower()
        
        if "collect" in task_text or "gather" in task_text:
            stages.append("collection")
        if "process" in task_text or "transform" in task_text:
            stages.append("processing")
        if "analyze" in task_text or "evaluate" in task_text:
            stages.append("analysis")
        if "validate" in task_text or "check" in task_text:
            stages.append("validation")
        if "output" in task_text or "deliver" in task_text or "report" in task_text:
            stages.append("output")
        
        # Default to common stages if none identified
        return stages if stages else common_stages[:min(5, len(tasks))]
    
    def _select_tools_for_domain(self, domain: str) -> List[Tool]:
        """Select appropriate tools for a specific domain"""
        domain_tools = {
            "research": [self.common_tools["web_search"], self.common_tools["data_analyzer"]],
            "development": [self.common_tools["code_executor"], self.common_tools["file_manager"]],
            "data": [self.common_tools["data_analyzer"], self.common_tools["file_manager"]],
            "communication": [self.common_tools["api_client"], self.common_tools["file_manager"]],
            "file": [self.common_tools["file_manager"]]
        }
        
        return domain_tools.get(domain, [self.common_tools["api_client"]])
    
    def _select_tools_for_stage(self, stage: str) -> List[Tool]:
        """Select appropriate tools for a pipeline stage"""
        stage_tools = {
            "input": [self.common_tools["api_client"], self.common_tools["file_manager"]],
            "collection": [self.common_tools["web_search"], self.common_tools["api_client"]],
            "process": [self.common_tools["code_executor"], self.common_tools["data_analyzer"]],
            "processing": [self.common_tools["data_analyzer"], self.common_tools["code_executor"]],
            "transform": [self.common_tools["data_analyzer"], self.common_tools["code_executor"]],
            "analysis": [self.common_tools["data_analyzer"]],
            "validate": [self.common_tools["data_analyzer"]],
            "validation": [self.common_tools["data_analyzer"]],
            "output": [self.common_tools["file_manager"], self.common_tools["api_client"]]
        }
        
        return stage_tools.get(stage, [self.common_tools["file_manager"]])
    
    def _select_diverse_tools(self) -> List[Tool]:
        """Select a diverse set of tools for general purpose agents"""
        return [
            self.common_tools["file_manager"],
            self.common_tools["code_executor"],
            self.common_tools["data_analyzer"]
        ]
    
    def design_communication_topology(self, agents: List[AgentDefinition], pattern: AgentArchitecturePattern) -> List[CommunicationLink]:
        """Design communication links between agents"""
        links = []
        
        if pattern == AgentArchitecturePattern.SINGLE_AGENT:
            # No inter-agent communication needed
            return []
        
        elif pattern == AgentArchitecturePattern.SUPERVISOR:
            supervisor = next(agent for agent in agents if agent.archetype == AgentRole.COORDINATOR)
            specialists = [agent for agent in agents if agent.archetype == AgentRole.SPECIALIST]
            
            for specialist in specialists:
                # Bidirectional communication with supervisor
                links.append(CommunicationLink(
                    from_agent=supervisor.name,
                    to_agent=specialist.name,
                    pattern=CommunicationPattern.DIRECT_MESSAGE,
                    data_format="json",
                    frequency="on_demand",
                    criticality="high"
                ))
                links.append(CommunicationLink(
                    from_agent=specialist.name,
                    to_agent=supervisor.name,
                    pattern=CommunicationPattern.DIRECT_MESSAGE,
                    data_format="json",
                    frequency="on_completion",
                    criticality="high"
                ))
        
        elif pattern == AgentArchitecturePattern.SWARM:
            # All-to-all communication for swarm
            for i, agent1 in enumerate(agents):
                for j, agent2 in enumerate(agents):
                    if i != j:
                        links.append(CommunicationLink(
                            from_agent=agent1.name,
                            to_agent=agent2.name,
                            pattern=CommunicationPattern.EVENT_DRIVEN,
                            data_format="json",
                            frequency="periodic",
                            criticality="medium"
                        ))
        
        elif pattern == AgentArchitecturePattern.HIERARCHICAL:
            # Hierarchical communication based on dependencies
            for agent in agents:
                if agent.dependencies:
                    for dependency in agent.dependencies:
                        links.append(CommunicationLink(
                            from_agent=dependency,
                            to_agent=agent.name,
                            pattern=CommunicationPattern.DIRECT_MESSAGE,
                            data_format="json",
                            frequency="scheduled",
                            criticality="high"
                        ))
                        links.append(CommunicationLink(
                            from_agent=agent.name,
                            to_agent=dependency,
                            pattern=CommunicationPattern.DIRECT_MESSAGE,
                            data_format="json",
                            frequency="on_completion",
                            criticality="high"
                        ))
        
        elif pattern == AgentArchitecturePattern.PIPELINE:
            # Sequential pipeline communication
            for i in range(len(agents) - 1):
                links.append(CommunicationLink(
                    from_agent=agents[i].name,
                    to_agent=agents[i + 1].name,
                    pattern=CommunicationPattern.MESSAGE_QUEUE,
                    data_format="json",
                    frequency="continuous",
                    criticality="high"
                ))
        
        return links
    
    def generate_mermaid_diagram(self, design: ArchitectureDesign) -> str:
        """Generate Mermaid diagram for the architecture"""
        diagram = ["graph TD"]
        
        # Add agent nodes
        for agent in design.agents:
            node_style = self._get_node_style(agent.archetype)
            diagram.append(f"    {agent.name}[{agent.role}]{node_style}")
        
        # Add communication links
        for link in design.communication_topology:
            arrow_style = self._get_arrow_style(link.pattern, link.criticality)
            diagram.append(f"    {link.from_agent} {arrow_style} {link.to_agent}")
        
        # Add styling
        diagram.extend([
            "",
            "    classDef coordinator fill:#e1f5fe,stroke:#01579b,stroke-width:2px",
            "    classDef specialist fill:#f3e5f5,stroke:#4a148c,stroke-width:2px",
            "    classDef interface fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px",
            "    classDef monitor fill:#fff3e0,stroke:#e65100,stroke-width:2px"
        ])
        
        # Apply classes to nodes
        for agent in design.agents:
            class_name = agent.archetype.value
            diagram.append(f"    class {agent.name} {class_name}")
        
        return "\n".join(diagram)
    
    def _get_node_style(self, archetype: AgentRole) -> str:
        """Get node styling based on archetype"""
        styles = {
            AgentRole.COORDINATOR: ":::coordinator",
            AgentRole.SPECIALIST: ":::specialist", 
            AgentRole.INTERFACE: ":::interface",
            AgentRole.MONITOR: ":::monitor"
        }
        return styles.get(archetype, "")
    
    def _get_arrow_style(self, pattern: CommunicationPattern, criticality: str) -> str:
        """Get arrow styling based on communication pattern and criticality"""
        base_arrows = {
            CommunicationPattern.DIRECT_MESSAGE: "-->",
            CommunicationPattern.SHARED_STATE: "-.->",
            CommunicationPattern.EVENT_DRIVEN: "===>",
            CommunicationPattern.MESSAGE_QUEUE: "==="
        }
        
        arrow = base_arrows.get(pattern, "-->")
        
        # Modify for criticality
        if criticality == "high":
            return arrow
        elif criticality == "medium":
            return arrow.replace("-", ".")
        else:
            return arrow.replace("-", ":")
    
    def generate_implementation_roadmap(self, design: ArchitectureDesign, requirements: SystemRequirements) -> Dict[str, Any]:
        """Generate implementation roadmap"""
        phases = []
        
        # Phase 1: Core Infrastructure
        phases.append({
            "phase": 1,
            "name": "Core Infrastructure",
            "duration": "2-3 weeks",
            "tasks": [
                "Set up development environment",
                "Implement basic agent framework",
                "Create communication infrastructure",
                "Set up monitoring and logging",
                "Implement basic tools"
            ],
            "deliverables": [
                "Agent runtime framework",
                "Communication layer",
                "Basic monitoring dashboard"
            ]
        })
        
        # Phase 2: Agent Implementation
        phases.append({
            "phase": 2,
            "name": "Agent Implementation",
            "duration": "3-4 weeks",
            "tasks": [
                "Implement individual agent logic",
                "Create agent-specific tools",
                "Implement communication protocols",
                "Add error handling and recovery",
                "Create agent configuration system"
            ],
            "deliverables": [
                "Functional agent implementations",
                "Tool integration",
                "Configuration management"
            ]
        })
        
        # Phase 3: Integration and Testing
        phases.append({
            "phase": 3,
            "name": "Integration and Testing",
            "duration": "2-3 weeks",
            "tasks": [
                "Integrate all agents",
                "End-to-end testing",
                "Performance optimization",
                "Security implementation",
                "Documentation creation"
            ],
            "deliverables": [
                "Integrated system",
                "Test suite",
                "Performance benchmarks",
                "Security audit report"
            ]
        })
        
        # Phase 4: Deployment and Monitoring
        phases.append({
            "phase": 4,
            "name": "Deployment and Monitoring",
            "duration": "1-2 weeks",
            "tasks": [
                "Production deployment",
                "Monitoring setup",
                "Alerting configuration",
                "User training",
                "Go-live support"
            ],
            "deliverables": [
                "Production system",
                "Monitoring dashboard",
                "Operational runbooks",
                "Training materials"
            ]
        })
        
        return {
            "total_duration": "8-12 weeks",
            "phases": phases,
            "critical_path": [
                "Agent framework implementation",
                "Communication layer development", 
                "Integration testing",
                "Production deployment"
            ],
            "risks": [
                {
                    "risk": "Communication complexity",
                    "impact": "high",
                    "mitigation": "Start with simple protocols, iterate"
                },
                {
                    "risk": "Agent coordination failures",
                    "impact": "medium",
                    "mitigation": "Implement robust error handling and fallbacks"
                },
                {
                    "risk": "Performance bottlenecks",
                    "impact": "medium",
                    "mitigation": "Early performance testing and optimization"
                }
            ],
            "success_criteria": requirements.safety_requirements + [
                "All agents operational",
                "Communication working reliably",
                "Performance targets met",
                "Error rate below 1%"
            ]
        }
    
    def plan_system(self, requirements: SystemRequirements) -> Tuple[ArchitectureDesign, str, Dict[str, Any]]:
        """Main planning function"""
        # Select architecture pattern
        pattern = self.select_architecture_pattern(requirements)
        
        # Design agents
        agents = self.design_agents(requirements, pattern)
        
        # Design communication topology
        communication_topology = self.design_communication_topology(agents, pattern)
        
        # Create complete design
        design = ArchitectureDesign(
            pattern=pattern,
            agents=agents,
            communication_topology=communication_topology,
            shared_resources=[
                {"type": "message_queue", "capacity": 1000},
                {"type": "shared_memory", "size": "1GB"},
                {"type": "event_store", "retention": "30 days"}
            ],
            guardrails=[
                {"type": "input_validation", "rules": "strict_schema_enforcement"},
                {"type": "rate_limiting", "limit": "100_requests_per_minute"},
                {"type": "output_filtering", "rules": "content_safety_check"}
            ],
            scaling_strategy={
                "horizontal_scaling": True,
                "auto_scaling_triggers": ["cpu > 80%", "queue_depth > 100"],
                "max_instances_per_agent": 5
            },
            failure_handling={
                "retry_policy": "exponential_backoff",
                "circuit_breaker": True,
                "fallback_strategies": ["graceful_degradation", "human_escalation"]
            }
        )
        
        # Generate Mermaid diagram
        mermaid_diagram = self.generate_mermaid_diagram(design)
        
        # Generate implementation roadmap
        roadmap = self.generate_implementation_roadmap(design, requirements)
        
        return design, mermaid_diagram, roadmap


def main():
    parser = argparse.ArgumentParser(description="Multi-Agent System Architecture Planner")
    parser.add_argument("input_file", help="JSON file with system requirements")
    parser.add_argument("-o", "--output", help="Output file prefix (default: agent_architecture)")
    parser.add_argument("--format", choices=["json", "yaml", "both"], default="both", 
                       help="Output format")
    
    args = parser.parse_args()
    
    try:
        # Load requirements
        with open(args.input_file, 'r') as f:
            requirements_data = json.load(f)
        
        requirements = SystemRequirements(**requirements_data)
        
        # Plan the system
        planner = AgentPlanner()
        design, mermaid_diagram, roadmap = planner.plan_system(requirements)
        
        # Prepare output
        output_data = {
            "architecture_design": asdict(design),
            "mermaid_diagram": mermaid_diagram,
            "implementation_roadmap": roadmap,
            "metadata": {
                "generated_by": "agent_planner.py",
                "requirements_file": args.input_file,
                "architecture_pattern": design.pattern.value,
                "agent_count": len(design.agents)
            }
        }
        
        # Output files
        output_prefix = args.output or "agent_architecture"
        
        if args.format in ["json", "both"]:
            with open(f"{output_prefix}.json", 'w') as f:
                json.dump(output_data, f, indent=2, default=str)
            print(f"JSON output written to {output_prefix}.json")
        
        if args.format in ["both"]:
            # Also create separate files for key components
            with open(f"{output_prefix}_diagram.mmd", 'w') as f:
                f.write(mermaid_diagram)
            print(f"Mermaid diagram written to {output_prefix}_diagram.mmd")
            
            with open(f"{output_prefix}_roadmap.json", 'w') as f:
                json.dump(roadmap, f, indent=2)
            print(f"Implementation roadmap written to {output_prefix}_roadmap.json")
        
        # Print summary
        print(f"\nArchitecture Summary:")
        print(f"Pattern: {design.pattern.value}")
        print(f"Agents: {len(design.agents)}")
        print(f"Communication Links: {len(design.communication_topology)}")
        print(f"Estimated Duration: {roadmap['total_duration']}")
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()