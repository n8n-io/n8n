#!/usr/bin/env python3
"""
Tool Schema Generator - Generate structured tool schemas for AI agents

Given a description of desired tools (name, purpose, inputs, outputs), generates
structured tool schemas compatible with OpenAI function calling format and 
Anthropic tool use format. Includes: input validation rules, error response 
formats, example calls, rate limit suggestions.

Input: tool descriptions JSON
Output: tool schemas (OpenAI + Anthropic format) + validation rules + example usage
"""

import json
import argparse
import sys
import re
from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass, asdict
from enum import Enum


class ParameterType(Enum):
    """Parameter types for tool schemas"""
    STRING = "string"
    INTEGER = "integer"
    NUMBER = "number"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"
    NULL = "null"


class ValidationRule(Enum):
    """Validation rule types"""
    REQUIRED = "required"
    MIN_LENGTH = "min_length"
    MAX_LENGTH = "max_length"
    PATTERN = "pattern"
    ENUM = "enum"
    MINIMUM = "minimum"
    MAXIMUM = "maximum"
    MIN_ITEMS = "min_items"
    MAX_ITEMS = "max_items"
    UNIQUE_ITEMS = "unique_items"
    FORMAT = "format"


@dataclass
class ParameterSpec:
    """Parameter specification for tool inputs/outputs"""
    name: str
    type: ParameterType
    description: str
    required: bool = False
    default: Any = None
    validation_rules: Dict[str, Any] = None
    examples: List[Any] = None
    deprecated: bool = False


@dataclass
class ErrorSpec:
    """Error specification for tool responses"""
    error_code: str
    error_message: str
    http_status: int
    retry_after: Optional[int] = None
    details: Dict[str, Any] = None


@dataclass
class RateLimitSpec:
    """Rate limiting specification"""
    requests_per_minute: int
    requests_per_hour: int
    requests_per_day: int
    burst_limit: int
    cooldown_period: int
    rate_limit_key: str = "user_id"


@dataclass
class ToolDescription:
    """Input tool description"""
    name: str
    purpose: str
    category: str
    inputs: List[Dict[str, Any]]
    outputs: List[Dict[str, Any]]
    error_conditions: List[str]
    side_effects: List[str]
    idempotent: bool
    rate_limits: Dict[str, Any]
    dependencies: List[str]
    examples: List[Dict[str, Any]]
    security_requirements: List[str]


@dataclass
class ToolSchema:
    """Complete tool schema with validation and examples"""
    name: str
    description: str
    openai_schema: Dict[str, Any]
    anthropic_schema: Dict[str, Any]
    validation_rules: List[Dict[str, Any]]
    error_responses: List[ErrorSpec]
    rate_limits: RateLimitSpec
    examples: List[Dict[str, Any]]
    metadata: Dict[str, Any]


class ToolSchemaGenerator:
    """Generate structured tool schemas from descriptions"""
    
    def __init__(self):
        self.common_patterns = self._define_common_patterns()
        self.format_validators = self._define_format_validators()
        self.security_templates = self._define_security_templates()
    
    def _define_common_patterns(self) -> Dict[str, str]:
        """Define common regex patterns for validation"""
        return {
            "email": r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
            "url": r"^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$",
            "uuid": r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
            "phone": r"^\+?1?[0-9]{10,15}$",
            "ip_address": r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$",
            "date": r"^\d{4}-\d{2}-\d{2}$",
            "datetime": r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$",
            "slug": r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
            "semantic_version": r"^(?P<major>0|[1-9]\d*)\.(?P<minor>0|[1-9]\d*)\.(?P<patch>0|[1-9]\d*)(?:-(?P<prerelease>(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+(?P<buildmetadata>[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$"
        }
    
    def _define_format_validators(self) -> Dict[str, Dict[str, Any]]:
        """Define format validators for common data types"""
        return {
            "email": {
                "type": "string",
                "format": "email",
                "pattern": self.common_patterns["email"],
                "min_length": 5,
                "max_length": 254
            },
            "url": {
                "type": "string",
                "format": "uri",
                "pattern": self.common_patterns["url"],
                "min_length": 7,
                "max_length": 2048
            },
            "uuid": {
                "type": "string",
                "format": "uuid",
                "pattern": self.common_patterns["uuid"],
                "min_length": 36,
                "max_length": 36
            },
            "date": {
                "type": "string",
                "format": "date",
                "pattern": self.common_patterns["date"],
                "min_length": 10,
                "max_length": 10
            },
            "datetime": {
                "type": "string",
                "format": "date-time",
                "pattern": self.common_patterns["datetime"],
                "min_length": 19,
                "max_length": 30
            },
            "password": {
                "type": "string",
                "min_length": 8,
                "max_length": 128,
                "pattern": r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]"
            }
        }
    
    def _define_security_templates(self) -> Dict[str, Dict[str, Any]]:
        """Define security requirement templates"""
        return {
            "authentication_required": {
                "requires_auth": True,
                "auth_methods": ["bearer_token", "api_key"],
                "scope_required": ["read", "write"]
            },
            "rate_limited": {
                "rate_limits": {
                    "requests_per_minute": 60,
                    "requests_per_hour": 1000,
                    "burst_limit": 10
                }
            },
            "input_sanitization": {
                "sanitize_html": True,
                "validate_sql_injection": True,
                "escape_special_chars": True
            },
            "output_validation": {
                "validate_response_schema": True,
                "filter_sensitive_data": True,
                "content_type_validation": True
            }
        }
    
    def parse_tool_description(self, description: ToolDescription) -> ParameterSpec:
        """Parse tool description into structured parameters"""
        input_params = []
        output_params = []
        
        # Parse input parameters
        for input_spec in description.inputs:
            param = self._parse_parameter_spec(input_spec)
            input_params.append(param)
        
        # Parse output parameters
        for output_spec in description.outputs:
            param = self._parse_parameter_spec(output_spec)
            output_params.append(param)
        
        return input_params, output_params
    
    def _parse_parameter_spec(self, param_spec: Dict[str, Any]) -> ParameterSpec:
        """Parse individual parameter specification"""
        name = param_spec.get("name", "")
        type_str = param_spec.get("type", "string")
        description = param_spec.get("description", "")
        required = param_spec.get("required", False)
        default = param_spec.get("default")
        examples = param_spec.get("examples", [])
        
        # Parse parameter type
        param_type = self._parse_parameter_type(type_str)
        
        # Generate validation rules
        validation_rules = self._generate_validation_rules(param_spec, param_type)
        
        return ParameterSpec(
            name=name,
            type=param_type,
            description=description,
            required=required,
            default=default,
            validation_rules=validation_rules,
            examples=examples
        )
    
    def _parse_parameter_type(self, type_str: str) -> ParameterType:
        """Parse parameter type from string"""
        type_mapping = {
            "str": ParameterType.STRING,
            "string": ParameterType.STRING,
            "text": ParameterType.STRING,
            "int": ParameterType.INTEGER,
            "integer": ParameterType.INTEGER,
            "float": ParameterType.NUMBER,
            "number": ParameterType.NUMBER,
            "bool": ParameterType.BOOLEAN,
            "boolean": ParameterType.BOOLEAN,
            "list": ParameterType.ARRAY,
            "array": ParameterType.ARRAY,
            "dict": ParameterType.OBJECT,
            "object": ParameterType.OBJECT,
            "null": ParameterType.NULL,
            "none": ParameterType.NULL
        }
        
        return type_mapping.get(type_str.lower(), ParameterType.STRING)
    
    def _generate_validation_rules(self, param_spec: Dict[str, Any], param_type: ParameterType) -> Dict[str, Any]:
        """Generate validation rules for a parameter"""
        rules = {}
        
        # Type-specific validation
        if param_type == ParameterType.STRING:
            rules.update(self._generate_string_validation(param_spec))
        elif param_type == ParameterType.INTEGER:
            rules.update(self._generate_integer_validation(param_spec))
        elif param_type == ParameterType.NUMBER:
            rules.update(self._generate_number_validation(param_spec))
        elif param_type == ParameterType.ARRAY:
            rules.update(self._generate_array_validation(param_spec))
        elif param_type == ParameterType.OBJECT:
            rules.update(self._generate_object_validation(param_spec))
        
        # Common validation rules
        if param_spec.get("required", False):
            rules["required"] = True
        
        if "enum" in param_spec:
            rules["enum"] = param_spec["enum"]
        
        if "pattern" in param_spec:
            rules["pattern"] = param_spec["pattern"]
        elif self._detect_format(param_spec.get("name", ""), param_spec.get("description", "")):
            format_name = self._detect_format(param_spec.get("name", ""), param_spec.get("description", ""))
            if format_name in self.format_validators:
                rules.update(self.format_validators[format_name])
        
        return rules
    
    def _generate_string_validation(self, param_spec: Dict[str, Any]) -> Dict[str, Any]:
        """Generate string-specific validation rules"""
        rules = {}
        
        if "min_length" in param_spec:
            rules["minLength"] = param_spec["min_length"]
        elif "min_len" in param_spec:
            rules["minLength"] = param_spec["min_len"]
        else:
            # Infer from description
            desc = param_spec.get("description", "").lower()
            if "password" in desc:
                rules["minLength"] = 8
            elif "email" in desc:
                rules["minLength"] = 5
            elif "name" in desc:
                rules["minLength"] = 1
        
        if "max_length" in param_spec:
            rules["maxLength"] = param_spec["max_length"]
        elif "max_len" in param_spec:
            rules["maxLength"] = param_spec["max_len"]
        else:
            # Reasonable defaults
            desc = param_spec.get("description", "").lower()
            if "password" in desc:
                rules["maxLength"] = 128
            elif "email" in desc:
                rules["maxLength"] = 254
            elif "description" in desc or "content" in desc:
                rules["maxLength"] = 10000
            elif "name" in desc or "title" in desc:
                rules["maxLength"] = 255
            else:
                rules["maxLength"] = 1000
        
        return rules
    
    def _generate_integer_validation(self, param_spec: Dict[str, Any]) -> Dict[str, Any]:
        """Generate integer-specific validation rules"""
        rules = {}
        
        if "minimum" in param_spec:
            rules["minimum"] = param_spec["minimum"]
        elif "min" in param_spec:
            rules["minimum"] = param_spec["min"]
        else:
            # Infer from context
            name = param_spec.get("name", "").lower()
            desc = param_spec.get("description", "").lower()
            if any(word in name + desc for word in ["count", "quantity", "amount", "size", "limit"]):
                rules["minimum"] = 0
            elif "page" in name + desc:
                rules["minimum"] = 1
            elif "port" in name + desc:
                rules["minimum"] = 1
                rules["maximum"] = 65535
        
        if "maximum" in param_spec:
            rules["maximum"] = param_spec["maximum"]
        elif "max" in param_spec:
            rules["maximum"] = param_spec["max"]
        
        return rules
    
    def _generate_number_validation(self, param_spec: Dict[str, Any]) -> Dict[str, Any]:
        """Generate number-specific validation rules"""
        rules = {}
        
        if "minimum" in param_spec:
            rules["minimum"] = param_spec["minimum"]
        if "maximum" in param_spec:
            rules["maximum"] = param_spec["maximum"]
        if "exclusive_minimum" in param_spec:
            rules["exclusiveMinimum"] = param_spec["exclusive_minimum"]
        if "exclusive_maximum" in param_spec:
            rules["exclusiveMaximum"] = param_spec["exclusive_maximum"]
        if "multiple_of" in param_spec:
            rules["multipleOf"] = param_spec["multiple_of"]
        
        return rules
    
    def _generate_array_validation(self, param_spec: Dict[str, Any]) -> Dict[str, Any]:
        """Generate array-specific validation rules"""
        rules = {}
        
        if "min_items" in param_spec:
            rules["minItems"] = param_spec["min_items"]
        elif "min_length" in param_spec:
            rules["minItems"] = param_spec["min_length"]
        else:
            rules["minItems"] = 0
        
        if "max_items" in param_spec:
            rules["maxItems"] = param_spec["max_items"]
        elif "max_length" in param_spec:
            rules["maxItems"] = param_spec["max_length"]
        else:
            rules["maxItems"] = 1000  # Reasonable default
        
        if param_spec.get("unique_items", False):
            rules["uniqueItems"] = True
        
        if "item_type" in param_spec:
            rules["items"] = {"type": param_spec["item_type"]}
        
        return rules
    
    def _generate_object_validation(self, param_spec: Dict[str, Any]) -> Dict[str, Any]:
        """Generate object-specific validation rules"""
        rules = {}
        
        if "properties" in param_spec:
            rules["properties"] = param_spec["properties"]
        
        if "required_properties" in param_spec:
            rules["required"] = param_spec["required_properties"]
        
        if "additional_properties" in param_spec:
            rules["additionalProperties"] = param_spec["additional_properties"]
        else:
            rules["additionalProperties"] = False
        
        if "min_properties" in param_spec:
            rules["minProperties"] = param_spec["min_properties"]
        
        if "max_properties" in param_spec:
            rules["maxProperties"] = param_spec["max_properties"]
        
        return rules
    
    def _detect_format(self, name: str, description: str) -> Optional[str]:
        """Detect parameter format from name and description"""
        combined = (name + " " + description).lower()
        
        format_indicators = {
            "email": ["email", "e-mail", "email_address"],
            "url": ["url", "uri", "link", "website", "endpoint"],
            "uuid": ["uuid", "guid", "identifier", "id"],
            "date": ["date", "birthday", "created_date", "modified_date"],
            "datetime": ["datetime", "timestamp", "created_at", "updated_at"],
            "password": ["password", "secret", "token", "api_key"]
        }
        
        for format_name, indicators in format_indicators.items():
            if any(indicator in combined for indicator in indicators):
                return format_name
        
        return None
    
    def generate_openai_schema(self, description: ToolDescription, input_params: List[ParameterSpec]) -> Dict[str, Any]:
        """Generate OpenAI function calling schema"""
        properties = {}
        required = []
        
        for param in input_params:
            prop_def = {
                "type": param.type.value,
                "description": param.description
            }
            
            # Add validation rules
            if param.validation_rules:
                prop_def.update(param.validation_rules)
            
            # Add examples
            if param.examples:
                prop_def["examples"] = param.examples
            
            # Add default value
            if param.default is not None:
                prop_def["default"] = param.default
            
            properties[param.name] = prop_def
            
            if param.required:
                required.append(param.name)
        
        schema = {
            "name": description.name,
            "description": description.purpose,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required,
                "additionalProperties": False
            }
        }
        
        return schema
    
    def generate_anthropic_schema(self, description: ToolDescription, input_params: List[ParameterSpec]) -> Dict[str, Any]:
        """Generate Anthropic tool use schema"""
        input_schema = {
            "type": "object",
            "properties": {},
            "required": []
        }
        
        for param in input_params:
            prop_def = {
                "type": param.type.value,
                "description": param.description
            }
            
            # Add validation rules (Anthropic uses subset of JSON Schema)
            if param.validation_rules:
                # Filter to supported validation rules
                supported_rules = ["minLength", "maxLength", "minimum", "maximum", "pattern", "enum", "items"]
                for rule, value in param.validation_rules.items():
                    if rule in supported_rules:
                        prop_def[rule] = value
            
            input_schema["properties"][param.name] = prop_def
            
            if param.required:
                input_schema["required"].append(param.name)
        
        schema = {
            "name": description.name,
            "description": description.purpose,
            "input_schema": input_schema
        }
        
        return schema
    
    def generate_error_responses(self, description: ToolDescription) -> List[ErrorSpec]:
        """Generate error response specifications"""
        error_specs = []
        
        # Common errors
        common_errors = [
            {
                "error_code": "invalid_input",
                "error_message": "Invalid input parameters provided",
                "http_status": 400,
                "details": {"validation_errors": []}
            },
            {
                "error_code": "authentication_required",
                "error_message": "Authentication required to access this tool",
                "http_status": 401
            },
            {
                "error_code": "insufficient_permissions",
                "error_message": "Insufficient permissions to perform this operation",
                "http_status": 403
            },
            {
                "error_code": "rate_limit_exceeded",
                "error_message": "Rate limit exceeded. Please try again later",
                "http_status": 429,
                "retry_after": 60
            },
            {
                "error_code": "internal_error",
                "error_message": "Internal server error occurred",
                "http_status": 500
            },
            {
                "error_code": "service_unavailable",
                "error_message": "Service temporarily unavailable",
                "http_status": 503,
                "retry_after": 300
            }
        ]
        
        # Add common errors
        for error in common_errors:
            error_specs.append(ErrorSpec(**error))
        
        # Add tool-specific errors based on error conditions
        for condition in description.error_conditions:
            if "not found" in condition.lower():
                error_specs.append(ErrorSpec(
                    error_code="resource_not_found",
                    error_message=f"Requested resource not found: {condition}",
                    http_status=404
                ))
            elif "timeout" in condition.lower():
                error_specs.append(ErrorSpec(
                    error_code="operation_timeout",
                    error_message=f"Operation timed out: {condition}",
                    http_status=408,
                    retry_after=30
                ))
            elif "quota" in condition.lower() or "limit" in condition.lower():
                error_specs.append(ErrorSpec(
                    error_code="quota_exceeded",
                    error_message=f"Quota or limit exceeded: {condition}",
                    http_status=429,
                    retry_after=3600
                ))
            elif "dependency" in condition.lower():
                error_specs.append(ErrorSpec(
                    error_code="dependency_failure",
                    error_message=f"Dependency service failure: {condition}",
                    http_status=502
                ))
        
        return error_specs
    
    def generate_rate_limits(self, description: ToolDescription) -> RateLimitSpec:
        """Generate rate limiting specification"""
        rate_limits = description.rate_limits
        
        # Default rate limits based on tool category
        defaults = {
            "search": {"rpm": 60, "rph": 1000, "rpd": 10000, "burst": 10},
            "data": {"rpm": 30, "rph": 500, "rpd": 5000, "burst": 5},
            "api": {"rpm": 100, "rph": 2000, "rpd": 20000, "burst": 20},
            "file": {"rpm": 120, "rph": 3000, "rpd": 30000, "burst": 30},
            "compute": {"rpm": 10, "rph": 100, "rpd": 1000, "burst": 3},
            "communication": {"rpm": 30, "rph": 300, "rpd": 3000, "burst": 5}
        }
        
        category_defaults = defaults.get(description.category.lower(), defaults["api"])
        
        return RateLimitSpec(
            requests_per_minute=rate_limits.get("requests_per_minute", category_defaults["rpm"]),
            requests_per_hour=rate_limits.get("requests_per_hour", category_defaults["rph"]),
            requests_per_day=rate_limits.get("requests_per_day", category_defaults["rpd"]),
            burst_limit=rate_limits.get("burst_limit", category_defaults["burst"]),
            cooldown_period=rate_limits.get("cooldown_period", 60),
            rate_limit_key=rate_limits.get("rate_limit_key", "user_id")
        )
    
    def generate_examples(self, description: ToolDescription, input_params: List[ParameterSpec]) -> List[Dict[str, Any]]:
        """Generate usage examples"""
        examples = []
        
        # Use provided examples if available
        if description.examples:
            for example in description.examples:
                examples.append(example)
        
        # Generate synthetic examples
        if len(examples) == 0:
            synthetic_example = self._generate_synthetic_example(description, input_params)
            if synthetic_example:
                examples.append(synthetic_example)
        
        # Ensure we have multiple examples showing different scenarios
        if len(examples) == 1 and len(input_params) > 1:
            # Generate minimal example
            minimal_example = self._generate_minimal_example(description, input_params)
            if minimal_example and minimal_example != examples[0]:
                examples.append(minimal_example)
        
        return examples
    
    def _generate_synthetic_example(self, description: ToolDescription, input_params: List[ParameterSpec]) -> Dict[str, Any]:
        """Generate a synthetic example based on parameter specifications"""
        example_input = {}
        
        for param in input_params:
            if param.examples:
                example_input[param.name] = param.examples[0]
            elif param.default is not None:
                example_input[param.name] = param.default
            else:
                example_input[param.name] = self._generate_example_value(param)
        
        # Generate expected output based on tool purpose
        expected_output = self._generate_example_output(description)
        
        return {
            "description": f"Example usage of {description.name}",
            "input": example_input,
            "expected_output": expected_output
        }
    
    def _generate_minimal_example(self, description: ToolDescription, input_params: List[ParameterSpec]) -> Dict[str, Any]:
        """Generate minimal example with only required parameters"""
        example_input = {}
        
        for param in input_params:
            if param.required:
                if param.examples:
                    example_input[param.name] = param.examples[0]
                else:
                    example_input[param.name] = self._generate_example_value(param)
        
        if not example_input:
            return None
        
        expected_output = self._generate_example_output(description)
        
        return {
            "description": f"Minimal example of {description.name} with required parameters only",
            "input": example_input,
            "expected_output": expected_output
        }
    
    def _generate_example_value(self, param: ParameterSpec) -> Any:
        """Generate example value for a parameter"""
        if param.type == ParameterType.STRING:
            format_examples = {
                "email": "user@example.com",
                "url": "https://example.com",
                "uuid": "123e4567-e89b-12d3-a456-426614174000",
                "date": "2024-01-15",
                "datetime": "2024-01-15T10:30:00Z"
            }
            
            # Check for format in validation rules
            if param.validation_rules and "format" in param.validation_rules:
                format_type = param.validation_rules["format"]
                if format_type in format_examples:
                    return format_examples[format_type]
            
            # Check for patterns or enum
            if param.validation_rules:
                if "enum" in param.validation_rules:
                    return param.validation_rules["enum"][0]
            
            # Generate based on name/description
            name_lower = param.name.lower()
            if "name" in name_lower:
                return "example_name"
            elif "query" in name_lower or "search" in name_lower:
                return "search query"
            elif "path" in name_lower:
                return "/path/to/resource"
            elif "message" in name_lower:
                return "Example message"
            else:
                return "example_value"
        
        elif param.type == ParameterType.INTEGER:
            if param.validation_rules:
                min_val = param.validation_rules.get("minimum", 0)
                max_val = param.validation_rules.get("maximum", 100)
                return min(max(42, min_val), max_val)
            return 42
        
        elif param.type == ParameterType.NUMBER:
            if param.validation_rules:
                min_val = param.validation_rules.get("minimum", 0.0)
                max_val = param.validation_rules.get("maximum", 100.0)
                return min(max(42.5, min_val), max_val)
            return 42.5
        
        elif param.type == ParameterType.BOOLEAN:
            return True
        
        elif param.type == ParameterType.ARRAY:
            return ["item1", "item2"]
        
        elif param.type == ParameterType.OBJECT:
            return {"key": "value"}
        
        else:
            return None
    
    def _generate_example_output(self, description: ToolDescription) -> Dict[str, Any]:
        """Generate example output based on tool description"""
        category = description.category.lower()
        
        if category == "search":
            return {
                "results": [
                    {"title": "Example Result 1", "url": "https://example.com/1", "snippet": "Example snippet..."},
                    {"title": "Example Result 2", "url": "https://example.com/2", "snippet": "Another snippet..."}
                ],
                "total_count": 2
            }
        elif category == "data":
            return {
                "data": [{"id": 1, "value": "example"}, {"id": 2, "value": "another"}],
                "metadata": {"count": 2, "processed_at": "2024-01-15T10:30:00Z"}
            }
        elif category == "file":
            return {
                "success": True,
                "file_path": "/path/to/file.txt",
                "size": 1024,
                "modified_at": "2024-01-15T10:30:00Z"
            }
        elif category == "api":
            return {
                "status": "success",
                "data": {"result": "operation completed successfully"},
                "timestamp": "2024-01-15T10:30:00Z"
            }
        else:
            return {
                "success": True,
                "message": f"{description.name} executed successfully",
                "result": "example result"
            }
    
    def generate_tool_schema(self, description: ToolDescription) -> ToolSchema:
        """Generate complete tool schema"""
        # Parse parameters
        input_params, output_params = self.parse_tool_description(description)
        
        # Generate schemas
        openai_schema = self.generate_openai_schema(description, input_params)
        anthropic_schema = self.generate_anthropic_schema(description, input_params)
        
        # Generate validation rules
        validation_rules = []
        for param in input_params:
            if param.validation_rules:
                validation_rules.append({
                    "parameter": param.name,
                    "rules": param.validation_rules
                })
        
        # Generate error responses
        error_responses = self.generate_error_responses(description)
        
        # Generate rate limits
        rate_limits = self.generate_rate_limits(description)
        
        # Generate examples
        examples = self.generate_examples(description, input_params)
        
        # Generate metadata
        metadata = {
            "category": description.category,
            "idempotent": description.idempotent,
            "side_effects": description.side_effects,
            "dependencies": description.dependencies,
            "security_requirements": description.security_requirements,
            "generated_at": "2024-01-15T10:30:00Z",
            "schema_version": "1.0",
            "input_parameters": len(input_params),
            "output_parameters": len(output_params),
            "required_parameters": sum(1 for p in input_params if p.required),
            "optional_parameters": sum(1 for p in input_params if not p.required)
        }
        
        return ToolSchema(
            name=description.name,
            description=description.purpose,
            openai_schema=openai_schema,
            anthropic_schema=anthropic_schema,
            validation_rules=validation_rules,
            error_responses=error_responses,
            rate_limits=rate_limits,
            examples=examples,
            metadata=metadata
        )


def main():
    parser = argparse.ArgumentParser(description="Tool Schema Generator for AI Agents")
    parser.add_argument("input_file", help="JSON file with tool descriptions")
    parser.add_argument("-o", "--output", help="Output file prefix (default: tool_schemas)")
    parser.add_argument("--format", choices=["json", "both"], default="both", 
                       help="Output format")
    parser.add_argument("--validate", action="store_true", 
                       help="Validate generated schemas")
    
    args = parser.parse_args()
    
    try:
        # Load tool descriptions
        with open(args.input_file, 'r') as f:
            tools_data = json.load(f)
        
        # Parse tool descriptions
        tool_descriptions = []
        for tool_data in tools_data.get("tools", []):
            tool_desc = ToolDescription(**tool_data)
            tool_descriptions.append(tool_desc)
        
        # Generate schemas
        generator = ToolSchemaGenerator()
        schemas = []
        
        for description in tool_descriptions:
            schema = generator.generate_tool_schema(description)
            schemas.append(schema)
            print(f"Generated schema for: {schema.name}")
        
        # Prepare output
        output_data = {
            "tool_schemas": [asdict(schema) for schema in schemas],
            "metadata": {
                "generated_by": "tool_schema_generator.py",
                "input_file": args.input_file,
                "tool_count": len(schemas),
                "generation_timestamp": "2024-01-15T10:30:00Z",
                "schema_version": "1.0"
            },
            "validation_summary": {
                "total_tools": len(schemas),
                "total_parameters": sum(schema.metadata["input_parameters"] for schema in schemas),
                "total_validation_rules": sum(len(schema.validation_rules) for schema in schemas),
                "total_examples": sum(len(schema.examples) for schema in schemas)
            }
        }
        
        # Output files
        output_prefix = args.output or "tool_schemas"
        
        if args.format in ["json", "both"]:
            with open(f"{output_prefix}.json", 'w') as f:
                json.dump(output_data, f, indent=2, default=str)
            print(f"JSON output written to {output_prefix}.json")
        
        if args.format == "both":
            # Generate separate files for different formats
            
            # OpenAI format
            openai_schemas = {
                "functions": [schema.openai_schema for schema in schemas]
            }
            with open(f"{output_prefix}_openai.json", 'w') as f:
                json.dump(openai_schemas, f, indent=2)
            print(f"OpenAI schemas written to {output_prefix}_openai.json")
            
            # Anthropic format
            anthropic_schemas = {
                "tools": [schema.anthropic_schema for schema in schemas]
            }
            with open(f"{output_prefix}_anthropic.json", 'w') as f:
                json.dump(anthropic_schemas, f, indent=2)
            print(f"Anthropic schemas written to {output_prefix}_anthropic.json")
            
            # Validation rules
            validation_data = {
                "validation_rules": {schema.name: schema.validation_rules for schema in schemas}
            }
            with open(f"{output_prefix}_validation.json", 'w') as f:
                json.dump(validation_data, f, indent=2)
            print(f"Validation rules written to {output_prefix}_validation.json")
            
            # Usage examples
            examples_data = {
                "examples": {schema.name: schema.examples for schema in schemas}
            }
            with open(f"{output_prefix}_examples.json", 'w') as f:
                json.dump(examples_data, f, indent=2)
            print(f"Usage examples written to {output_prefix}_examples.json")
        
        # Print summary
        print(f"\nSchema Generation Summary:")
        print(f"Tools processed: {len(schemas)}")
        print(f"Total input parameters: {sum(schema.metadata['input_parameters'] for schema in schemas)}")
        print(f"Total validation rules: {sum(len(schema.validation_rules) for schema in schemas)}")
        print(f"Total examples generated: {sum(len(schema.examples) for schema in schemas)}")
        
        # Validation if requested
        if args.validate:
            print("\nValidation Results:")
            for schema in schemas:
                validation_errors = []
                
                # Basic validation checks
                if not schema.openai_schema.get("parameters", {}).get("properties"):
                    validation_errors.append("Missing input parameters")
                
                if not schema.examples:
                    validation_errors.append("No usage examples")
                
                if not schema.validation_rules:
                    validation_errors.append("No validation rules defined")
                
                if validation_errors:
                    print(f"  {schema.name}: {', '.join(validation_errors)}")
                else:
                    print(f"  {schema.name}: ✓ Valid")
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()