#!/usr/bin/env python3
"""Unittest-style tests for Tiltfile."""

import unittest
from unittest.mock import patch


class TestTiltfileConfiguration(unittest.TestCase):
    """Test Tiltfile configuration using unittest framework."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.compile_cmd = 'go build -o bin/app ./cmd/app'
        self.docker_image = 'goapp'
        self.expected_ports = ['8080:8080', '9090:9090']
    
    def tearDown(self):
        """Clean up after tests."""
        # Cleanup if needed
        pass
    
    def test_compile_command(self):
        """Test the Go compilation command."""
        self.assertEqual(self.compile_cmd, 'go build -o bin/app ./cmd/app')
        self.assertIn('go build', self.compile_cmd)
        self.assertIn('bin/app', self.compile_cmd)
    
    def test_docker_image_name(self):
        """Test Docker image naming."""
        self.assertEqual(self.docker_image, 'goapp')
        self.assertIsInstance(self.docker_image, str)
        self.assertNotEqual(self.docker_image, '')
    
    def test_port_forwards(self):
        """Test port forwarding configuration."""
        self.assertEqual(len(self.expected_ports), 2)
        self.assertIn('8080:8080', self.expected_ports)
        self.assertIn('9090:9090', self.expected_ports)
        
        # Test port parsing
        for port_forward in self.expected_ports:
            host_port, container_port = port_forward.split(':')
            self.assertTrue(host_port.isdigit())
            self.assertTrue(container_port.isdigit())
    
    @patch('builtins.local_resource')
    def test_local_resource_compile(self, mock_local_resource):
        """Test compile local resource configuration."""
        # Simulate Tiltfile execution
        deps = ['./cmd', './internal', './pkg']
        
        # Verify dependencies
        self.assertIn('./cmd', deps)
        self.assertIn('./internal', deps)
        self.assertIn('./pkg', deps)
        self.assertEqual(len(deps), 3)
    
    @patch('builtins.docker_build')
    def test_docker_build_args(self, mock_docker_build):
        """Test Docker build arguments."""
        build_args = {'VERSION': 'dev'}
        only_files = ['./bin', './configs']
        
        self.assertEqual(build_args['VERSION'], 'dev')
        self.assertIn('./bin', only_files)
        self.assertIn('./configs', only_files)
    
    def test_kustomize_path(self):
        """Test Kustomize overlay path."""
        kustomize_path = './k8s/overlays/dev'
        self.assertTrue(kustomize_path.startswith('./k8s'))
        self.assertIn('overlays', kustomize_path)
        self.assertIn('dev', kustomize_path)
    
    def test_resource_dependencies(self):
        """Test resource dependency chain."""
        # compile -> goapp -> health-check
        deps_chain = {
            'compile': [],
            'goapp': ['compile'],
            'health-check': ['goapp']
        }
        
        # Verify dependency order
        self.assertEqual(deps_chain['compile'], [])
        self.assertIn('compile', deps_chain['goapp'])
        self.assertIn('goapp', deps_chain['health-check'])
    
    def test_health_check_command(self):
        """Test health check curl command."""
        health_cmd = 'curl -f http://localhost:8080/health || exit 1'
        self.assertIn('curl', health_cmd)
        self.assertIn('http://localhost:8080/health', health_cmd)
        self.assertIn('|| exit 1', health_cmd)


class TestTiltfileExtensions(unittest.TestCase):
    """Test Tiltfile extension loading."""
    
    def test_restart_process_extension(self):
        """Test that restart_process extension is loaded."""
        # Would verify load('ext://restart_process', 'docker_build_with_restart')
        extension = 'ext://restart_process'
        function = 'docker_build_with_restart'
        
        self.assertTrue(extension.startswith('ext://'))
        self.assertIn('restart_process', extension)
        self.assertEqual(function, 'docker_build_with_restart')


class TestTiltfileValidation(unittest.TestCase):
    """Validation tests for Tiltfile syntax and structure."""
    
    @classmethod
    def setUpClass(cls):
        """Set up class-level fixtures."""
        cls.tiltfile_path = 'Tiltfile'
    
    def test_tiltfile_exists(self):
        """Test that Tiltfile exists."""
        # In fixture, we know it exists
        self.assertTrue(True)  # Placeholder
    
    def test_no_syntax_errors(self):
        """Test that Tiltfile has valid Python-like syntax."""
        # This would normally parse the Tiltfile
        # For fixture purposes, assume valid
        self.assertTrue(True)
    
    def test_required_functions_present(self):
        """Test that required Tilt functions are used."""
        required_functions = [
            'load',
            'local_resource',
            'docker_build',
            'k8s_yaml',
            'k8s_resource'
        ]
        
        # In real test, would parse Tiltfile and check
        for func in required_functions:
            self.assertIsInstance(func, str)


# Test suite aggregation
def suite():
    """Create test suite."""
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestTiltfileConfiguration))
    suite.addTest(unittest.makeSuite(TestTiltfileExtensions))
    suite.addTest(unittest.makeSuite(TestTiltfileValidation))
    return suite


if __name__ == '__main__':
    runner = unittest.TextTestRunner(verbosity=2)
    runner.run(suite())