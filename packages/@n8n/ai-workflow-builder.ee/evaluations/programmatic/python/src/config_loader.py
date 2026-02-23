"""
Configuration loader for workflow comparison.
Supports loading from YAML, JSON, and built-in presets.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Set
from pathlib import Path
import yaml
import json
import re


def _get_param_path_matching_pattern(pattern: str) -> str:
    """
    Convert glob-like pattern to regex pattern.
    Supports wildcards: ** (matches any chars including dots), * (matches any chars except dots)
    """
    # Use placeholders to preserve wildcards during escaping
    regex_pattern = pattern.replace("**", "\x00DOUBLE_STAR\x00").replace(
        "*", "\x00STAR\x00"
    )
    regex_pattern = regex_pattern.replace(".", r"\.")
    regex_pattern = regex_pattern.replace("\x00DOUBLE_STAR\x00", ".*").replace(
        "\x00STAR\x00", "[^.]*"
    )
    return regex_pattern


@dataclass
class NodeIgnoreRule:
    """Rule for ignoring nodes during comparison"""

    pattern: Optional[str] = None
    name: Optional[str] = None
    node_type: Optional[str] = None
    reason: str = ""

    def matches(self, node: Dict) -> bool:
        """Check if this rule matches a node"""
        if self.name and node.get("name") == self.name:
            return True
        if self.pattern and re.match(self.pattern, node.get("name", "")):
            return True
        if self.node_type and node.get("type") == self.node_type:
            return True
        return False


@dataclass
class ParameterComparisonRule:
    """Rule for comparing specific parameters"""

    parameter: str
    type: str  # 'semantic', 'normalized', 'exact', 'numeric'
    threshold: Optional[float] = None
    tolerance: Optional[float] = None
    cost_if_below: float = 0.0
    cost_if_exceeded: float = 0.0
    options: Dict[str, Any] = field(default_factory=dict)

    def matches_parameter(self, param_path: str) -> bool:
        """Check if this rule applies to a parameter path"""
        regex_pattern = _get_param_path_matching_pattern(self.parameter)
        return bool(re.match(f"^{regex_pattern}$", param_path))


@dataclass
class ExemptionRule:
    """Rule for exempting certain nodes from full cost"""

    name_pattern: Optional[str] = None
    node_type: Optional[str] = None
    penalty: float = 0.0
    reason: str = ""
    when: Optional[Dict[str, Any]] = None

    def matches(self, node: Dict) -> bool:
        """Check if node matches exemption"""
        match = False
        if self.name_pattern and re.match(self.name_pattern, node.get("name", "")):
            match = True
        if self.node_type and node.get("type") == self.node_type:
            match = True

        # Check additional conditions
        if match and self.when:
            for key, value in self.when.items():
                if node.get(key) != value:
                    return False

        return match


@dataclass
class WorkflowComparisonConfig:
    """Complete configuration for workflow comparison"""

    version: str = "1.0"
    name: str = "default"
    description: str = ""

    # Cost weights
    node_insertion_cost: float = 10.0
    node_deletion_cost: float = 10.0
    node_substitution_same_type: float = 1.0
    node_substitution_similar_type: float = 5.0
    node_substitution_different_type: float = 15.0
    node_substitution_trigger: float = 50.0

    edge_insertion_cost: float = 5.0
    edge_deletion_cost: float = 5.0
    edge_substitution_cost: float = 3.0

    parameter_mismatch_weight: float = 0.5
    parameter_nested_weight: float = 0.3

    # Similarity groups
    similarity_groups: Dict[str, List[str]] = field(default_factory=dict)

    # Ignore rules
    ignored_node_rules: List[NodeIgnoreRule] = field(default_factory=list)
    ignored_node_types: Set[str] = field(default_factory=set)
    ignored_global_parameters: Set[str] = field(default_factory=set)
    ignored_node_type_parameters: Dict[str, Set[str]] = field(default_factory=dict)
    ignored_parameter_paths: List[str] = field(default_factory=list)

    # Parameter comparison rules
    parameter_rules: List[ParameterComparisonRule] = field(default_factory=list)

    # Exemptions
    optional_in_generated: List[ExemptionRule] = field(default_factory=list)
    optional_in_ground_truth: List[ExemptionRule] = field(default_factory=list)

    # Connection rules
    ignored_connection_types: Set[str] = field(default_factory=set)
    equivalent_connection_types: List[List[str]] = field(default_factory=list)

    # Output config
    max_edits: int = 15
    group_by: str = "priority"
    include_explanations: bool = True
    include_suggestions: bool = True

    def should_ignore_node(self, node: Dict) -> bool:
        """Check if node should be ignored"""
        # Check node type
        if node.get("type") in self.ignored_node_types:
            return True

        # Check node rules
        for rule in self.ignored_node_rules:
            if rule.matches(node):
                return True

        return False

    def should_ignore_parameter(self, node_type: str, param_path: str) -> bool:
        """Check if parameter should be ignored"""
        # Global parameters
        param_name = param_path.split(".")[-1]
        if param_name in self.ignored_global_parameters:
            return True

        # Node type specific
        if node_type in self.ignored_node_type_parameters:
            if param_path in self.ignored_node_type_parameters[node_type]:
                return True
            # Check wildcards
            for ignored_path in self.ignored_node_type_parameters[node_type]:
                if self._matches_path_pattern(param_path, ignored_path):
                    return True

        # Parameter path patterns
        for pattern in self.ignored_parameter_paths:
            if self._matches_path_pattern(param_path, pattern):
                return True

        return False

    def get_parameter_rule(self, param_path: str) -> Optional[ParameterComparisonRule]:
        """Get comparison rule for parameter"""
        for rule in self.parameter_rules:
            if rule.matches_parameter(param_path):
                return rule
        return None

    def get_exemption_penalty(
        self,
        node: Dict,
        context: str,  # 'generated' or 'ground_truth'
    ) -> Optional[float]:
        """Get exemption penalty for a node, if applicable"""
        exemptions = (
            self.optional_in_generated
            if context == "generated"
            else self.optional_in_ground_truth
        )

        for exemption in exemptions:
            if exemption.matches(node):
                return exemption.penalty

        return None

    @staticmethod
    def _matches_path_pattern(path: str, pattern: str) -> bool:
        """Check if path matches pattern (supports ** and *)"""
        regex_pattern = _get_param_path_matching_pattern(pattern)
        return bool(re.match(f"^{regex_pattern}$", path))

    def are_node_types_similar(self, type1: str, type2: str) -> bool:
        """Check if two node types are in the same similarity group"""
        for group_name, types in self.similarity_groups.items():
            if type1 in types and type2 in types:
                return True
        return False

    def to_dict(self) -> Dict:
        """Convert config to dictionary for serialization"""
        return {
            "version": self.version,
            "name": self.name,
            "description": self.description,
            "costs": {
                "nodes": {
                    "insertion": self.node_insertion_cost,
                    "deletion": self.node_deletion_cost,
                    "substitution": {
                        "same_type": self.node_substitution_same_type,
                        "similar_type": self.node_substitution_similar_type,
                        "different_type": self.node_substitution_different_type,
                        "trigger_mismatch": self.node_substitution_trigger,
                    },
                },
                "edges": {
                    "insertion": self.edge_insertion_cost,
                    "deletion": self.edge_deletion_cost,
                    "substitution": self.edge_substitution_cost,
                },
                "parameters": {
                    "mismatch_weight": self.parameter_mismatch_weight,
                    "nested_weight": self.parameter_nested_weight,
                },
            },
            "similarity_groups": self.similarity_groups,
            "max_edits": self.max_edits,
        }

    @classmethod
    def from_yaml(cls, path: Path) -> "WorkflowComparisonConfig":
        """Load configuration from YAML file"""
        with open(path) as f:
            data = yaml.safe_load(f)
        return cls._from_dict(data)

    @classmethod
    def from_json(cls, path: Path) -> "WorkflowComparisonConfig":
        """Load configuration from JSON file"""
        with open(path) as f:
            data = json.load(f)
        return cls._from_dict(data)

    @classmethod
    def _from_dict(cls, data: Dict) -> "WorkflowComparisonConfig":
        """Parse configuration dictionary"""
        config = cls()

        # Basic info
        config.version = data.get("version", "1.0")
        config.name = data.get("name", "default")
        config.description = data.get("description", "")

        # Costs
        costs = data.get("costs", {})
        nodes = costs.get("nodes", {})
        config.node_insertion_cost = nodes.get("insertion", 10.0)
        config.node_deletion_cost = nodes.get("deletion", 10.0)

        subst = nodes.get("substitution", {})
        config.node_substitution_same_type = subst.get("same_type", 1.0)
        config.node_substitution_similar_type = subst.get("similar_type", 5.0)
        config.node_substitution_different_type = subst.get("different_type", 15.0)
        config.node_substitution_trigger = subst.get("trigger_mismatch", 50.0)

        edges = costs.get("edges", {})
        config.edge_insertion_cost = edges.get("insertion", 5.0)
        config.edge_deletion_cost = edges.get("deletion", 5.0)
        config.edge_substitution_cost = edges.get("substitution", 3.0)

        params = costs.get("parameters", {})
        config.parameter_mismatch_weight = params.get("mismatch_weight", 0.5)
        config.parameter_nested_weight = params.get("nested_weight", 0.3)

        # Similarity groups
        config.similarity_groups = data.get("similarity_groups", {})

        # Ignore rules
        ignore = data.get("ignore", {})

        # Node ignore rules
        for node_rule in ignore.get("nodes", []):
            config.ignored_node_rules.append(NodeIgnoreRule(**node_rule))

        config.ignored_node_types = set(ignore.get("node_types", []))
        config.ignored_global_parameters = set(ignore.get("global_parameters", []))

        # Node type parameters
        for node_type, params in ignore.get("node_type_parameters", {}).items():
            config.ignored_node_type_parameters[node_type] = set(params)

        config.ignored_parameter_paths = ignore.get("parameter_paths", [])

        # Parameter comparison rules
        param_comp = data.get("parameter_comparison", {})
        for rule_data in param_comp.get("fuzzy_match", []):
            config.parameter_rules.append(ParameterComparisonRule(**rule_data))

        for rule_data in param_comp.get("numeric_tolerance", []):
            rule_data["type"] = "numeric"
            config.parameter_rules.append(ParameterComparisonRule(**rule_data))

        # Exemptions
        exemptions = data.get("exemptions", {})
        for exemption_data in exemptions.get("optional_in_generated", []):
            config.optional_in_generated.append(ExemptionRule(**exemption_data))

        for exemption_data in exemptions.get("optional_in_ground_truth", []):
            config.optional_in_ground_truth.append(ExemptionRule(**exemption_data))

        # Connection rules
        connections = data.get("connections", {})
        config.ignored_connection_types = set(
            connections.get("ignore_connection_types", [])
        )
        config.equivalent_connection_types = connections.get("equivalent_types", [])

        # Output config
        output = data.get("output", {})
        config.max_edits = output.get("max_edits", 15)
        config.group_by = output.get("group_by", "priority")
        config.include_explanations = output.get("include_explanations", True)
        config.include_suggestions = output.get("include_suggestions", True)

        return config

    @classmethod
    def load_preset(cls, preset_name: str) -> "WorkflowComparisonConfig":
        """Load a built-in preset configuration"""
        presets_dir = Path(__file__).parent / "configs" / "presets"
        preset_path = presets_dir / f"{preset_name}.yaml"

        if not preset_path.exists():
            raise ValueError(f"Preset '{preset_name}' not found at {preset_path}")

        return cls.from_yaml(preset_path)


def load_config(config_source: Optional[str] = None) -> WorkflowComparisonConfig:
    """
    Load configuration from various sources.

    Args:
        config_source: Can be:
            - None: use default config
            - "preset:name": load built-in preset (e.g., "preset:strict")
            - "/path/to/config.yaml": load custom YAML file
            - "/path/to/config.json": load custom JSON file

    Returns:
        WorkflowComparisonConfig instance
    """
    if not config_source:
        return WorkflowComparisonConfig()

    if config_source.startswith("preset:"):
        preset_name = config_source.split(":", 1)[1]
        return WorkflowComparisonConfig.load_preset(preset_name)

    path = Path(config_source)
    if not path.exists():
        raise ValueError(f"Config file not found: {config_source}")

    if path.suffix in [".yaml", ".yml"]:
        return WorkflowComparisonConfig.from_yaml(path)
    elif path.suffix == ".json":
        return WorkflowComparisonConfig.from_json(path)
    else:
        raise ValueError(f"Unsupported config format: {path.suffix}")
